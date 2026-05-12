import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentFeeInstallment {
  studentId: string;
  feeStructureId: string;
  feeInstallmentId: string;
  installmentName: string;
  amount: number;
  amountPaid: number;
  amountPending: number;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  status: "pending" | "partial" | "paid" | "overdue";
  branchId: string;
  order: number;
  /** Pre-computed date for efficient reminder query. Set to dueDate - 5 days. */
  nextReminderDate?: string;
}

interface StudentRecord {
  fullName: string;
  parentDetails?: { userId?: string };
  branchId?: string;
}

interface UserRecord {
  fcmToken?: string;
  name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_SENDER_ID = "system";
const SYSTEM_SENDER_NAME = "School System";

/**
 * Reminder schedule: send a reminder every day starting 5 days before due date,
 * on the due date itself, and for 3 days after (overdue).
 * Total: days -5, -4, -3, -2, -1, 0 (due day), +1, +2, +3 overdue.
 */
const REMINDER_START_DAYS_BEFORE = 5;
const OVERDUE_REMINDER_DAYS = 3;

/** Deterministic system UID for conversation pairing */
const SCHOOL_SYSTEM_UID = "school_system";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EXISTING: onMessageCreate — Fan-out + FCM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Triggered on message creation in any conversation.
 * Handles denormalization (fan-out) to userChats and sends FCM notifications.
 */
export const onMessageCreate = functions.firestore
  .document("conversations/{conversationId}/messages/{messageId}")
  .onCreate(async (snapshot: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const { conversationId } = context.params;
    const messageData = snapshot.data();
    const senderId = messageData.senderId;
    const senderName = messageData.senderName;
    const text = messageData.text || (messageData.imageUrl ? "📷 Image" : "New message");
    const createdAt = messageData.createdAt || admin.firestore.FieldValue.serverTimestamp();

    const db = admin.firestore();

    // 1. Get conversation metadata to find participants and type
    const conversationRef = db.collection("conversations").doc(conversationId);
    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      console.error(`Conversation ${conversationId} does not exist.`);
      return;
    }

    const conversationData = conversationSnap.data()!;
    const participants = conversationData.participants as string[];
    const conversationType = conversationData.type;
    const conversationName = conversationData.name || senderName;

    // 2. Update conversation top-level document
    await conversationRef.update({
      lastMessage: text,
      lastMessageAt: createdAt,
    });

    // 3. Update userChats for all participants (Batch Update)
    const batch = db.batch();

    for (const uid of participants) {
      const userChatRef = db
        .collection("userChats")
        .doc(uid)
        .collection("conversations")
        .doc(conversationId);

      if (uid === senderId) {
        // Reset unread for sender
        batch.set(userChatRef, {
          lastMessage: text,
          lastMessageAt: createdAt,
          unreadCount: 0,
        }, { merge: true });
      } else {
        // Increment unread for recipients
        batch.set(userChatRef, {
          lastMessage: text,
          lastMessageAt: createdAt,
          unreadCount: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
      }
    }

    await batch.commit();

    // 4. Send FCM Notification
    try {
      const recipientUids = participants.filter((uid) => uid !== senderId);

      if (conversationType === "broadcast" || conversationType === "group") {
        // Use topics for groups/broadcasts
        const topic = conversationType === "broadcast" ? "parents" : `group_${conversationId}`;
        
        await admin.messaging().send({
          topic,
          notification: {
            title: conversationName,
            body: `${senderName}: ${text}`,
          },
          data: {
            conversationId,
            type: conversationType,
          },
        });
      } else if (recipientUids.length > 0) {
        // Direct chat: fetch recipient tokens
        const recipientUid = recipientUids[0];
        const userDoc = await db.collection("users").doc(recipientUid).get();
        const fcmToken = userDoc.data()?.fcmToken;

        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: senderName,
              body: text,
            },
            data: {
              conversationId,
              type: "direct",
            },
          });
        }
      }
    } catch (err) {
      console.error("FCM Notification failed:", err);
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SCHEDULED FEE REMINDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Runs daily at 08:00 AM IST (02:30 UTC).
 *
 * Architecture:
 *  ┌────────────────────────────┐
 *  │  Cloud Scheduler (daily)   │
 *  └────────────┬───────────────┘
 *               ▼
 *  ┌────────────────────────────┐
 *  │ Query studentFeeInstall-   │
 *  │ ments by nextReminderDate  │
 *  │ (status != paid)           │
 *  └────────────┬───────────────┘
 *               ▼
 *  ┌────────────────────────────┐
 *  │ Dedup via feeRemindersSent │
 *  │ keyed: fee_inst_student_   │
 *  │        reminderType        │
 *  └────────────┬───────────────┘
 *               ▼
 *  ┌────────────────────────────┐
 *  │ Resolve student → parent   │
 *  │ Create/reuse system conv.  │
 *  └────────────┬───────────────┘
 *               ▼
 *  ┌────────────────────────────┐
 *  │ Batch write:               │
 *  │  • system chat message     │
 *  │  • conversation summary    │
 *  │  • userChat unread++       │
 *  │  • dedup record            │
 *  └────────────┬───────────────┘
 *               ▼
 *  ┌────────────────────────────┐
 *  │ FCM push (non-blocking)    │
 *  └────────────────────────────┘
 *
 * Cost optimisations:
 *  - Uses nextReminderDate field for targeted queries (avoids full-collection scans)
 *  - Only reads unpaid installments whose nextReminderDate <= today
 *  - Deduplication prevents re-sending on Cloud Scheduler retries
 *  - Batch writes reduce round-trips (max 4 ops per reminder)
 *  - Stops automatically: paid installments have no nextReminderDate
 */
export const scheduledFeeReminders = functions.pubsub
  .schedule("30 2 * * *") // 02:30 UTC = 08:00 IST daily
  .timeZone("UTC")
  .onRun(async () => {
    const db = admin.firestore();

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayISO = now.toISOString().split("T")[0];

    console.info(`[FeeReminder] Running for date: ${todayISO}`);

    // ── Query: installments whose nextReminderDate <= today AND not paid ──────
    // This query uses the nextReminderDate field for efficient lookups.
    // Fallback: also query by dueDate range for installments that were created
    // before the nextReminderDate field existed (backward compat).
    let installmentsSnap: admin.firestore.QuerySnapshot;
    try {
      // Primary query: uses nextReminderDate (most efficient)
      installmentsSnap = await db
        .collection("studentFeeInstallments")
        .where("nextReminderDate", "<=", todayISO)
        .where("status", "in", ["pending", "partial"])
        .get();

      // Fallback: also pick up installments without nextReminderDate
      // that have dueDate in the window (backward compatibility for existing data)
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + REMINDER_START_DAYS_BEFORE);
      const windowEndISO = windowEnd.toISOString().split("T")[0];

      // Past-due window for overdue reminders
      const overdueStart = new Date(now);
      overdueStart.setDate(overdueStart.getDate() - OVERDUE_REMINDER_DAYS);
      const overdueStartISO = overdueStart.toISOString().split("T")[0];

      const fallbackSnap = await db
        .collection("studentFeeInstallments")
        .where("status", "in", ["pending", "partial"])
        .where("dueDate", ">=", overdueStartISO)
        .where("dueDate", "<=", windowEndISO)
        .get();

      // Merge results (deduplicate by doc ID)
      const seenIds = new Set(installmentsSnap.docs.map((d) => d.id));
      const extraDocs = fallbackSnap.docs.filter((d) => !seenIds.has(d.id));

      if (extraDocs.length > 0) {
        console.info(
          `[FeeReminder] Found ${extraDocs.length} extra installments via fallback query`
        );
        // Combine arrays for processing
        const allDocs = [...installmentsSnap.docs, ...extraDocs];
        // Process combined
        await _processAllInstallments(db, allDocs, now, todayISO);
        return;
      }
    } catch (err) {
      console.error("[FeeReminder] Query failed:", err);
      return;
    }

    if (installmentsSnap.empty) {
      console.info("[FeeReminder] No installments need reminders — done.");
      return;
    }

    await _processAllInstallments(db, installmentsSnap.docs, now, todayISO);
  });

// ─── Process all found installments ──────────────────────────────────────────

async function _processAllInstallments(
  db: admin.firestore.Firestore,
  docs: admin.firestore.QueryDocumentSnapshot[],
  now: Date,
  todayISO: string
): Promise<void> {
  console.info(`[FeeReminder] Processing ${docs.length} installments`);

  // Process in chunks to stay within Cloud Function time limits
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    await _processInstallmentChunk(db, chunk, now, todayISO);
  }

  console.info("[FeeReminder] Completed successfully.");
}

// ─── Process a chunk of installments ─────────────────────────────────────────

async function _processInstallmentChunk(
  db: admin.firestore.Firestore,
  docs: admin.firestore.QueryDocumentSnapshot[],
  now: Date,
  todayISO: string
): Promise<void> {
  for (const instDoc of docs) {
    const inst = instDoc.data() as StudentFeeInstallment;
    const instId = instDoc.id;

    // Skip if already fully paid (double-check even though query filters)
    if (inst.status === "paid") continue;

    // Determine which reminder type applies today
    const reminderType = _getReminderType(inst.dueDate, now);
    if (!reminderType) continue;

    // Compose deduplication key
    const dedupeKey = `${inst.feeStructureId}_${inst.feeInstallmentId}_${inst.studentId}_${reminderType}`;

    // ── Deduplication check ──────────────────────────────────────────────────
    const dedupeRef = db.collection("feeRemindersSent").doc(dedupeKey);
    const dedupeSnap = await dedupeRef.get();
    if (dedupeSnap.exists) continue; // Already sent today's type

    try {
      // ── Resolve student → parent ───────────────────────────────────────────
      const studentSnap = await db.collection("students").doc(inst.studentId).get();
      if (!studentSnap.exists) {
        console.warn(`[FeeReminder] Student not found: ${inst.studentId}`);
        continue;
      }
      const studentData = studentSnap.data() as StudentRecord;
      const studentName = studentData.fullName || "Student";
      const parentUserId = studentData.parentDetails?.userId;

      if (!parentUserId) {
        console.warn(`[FeeReminder] No parent userId for student: ${inst.studentId}`);
        continue;
      }

      // ── Resolve parent user ────────────────────────────────────────────────
      const parentUserSnap = await db.collection("users").doc(parentUserId).get();
      if (!parentUserSnap.exists) {
        console.warn(`[FeeReminder] Parent user not found: ${parentUserId}`);
        continue;
      }
      const parentUser = parentUserSnap.data() as UserRecord;

      // ── Build reminder message ─────────────────────────────────────────────
      const dueDateFormatted = _formatDate(inst.dueDate);
      const pendingAmount = inst.amountPending ?? inst.amount;
      const amountFormatted = `₹${pendingAmount.toLocaleString("en-IN")}`;
      const reminderText = _buildReminderText(
        reminderType,
        studentName,
        inst.installmentName,
        amountFormatted,
        dueDateFormatted
      );

      // ── Find/create system→parent conversation ─────────────────────────────
      const conversationId = await _getOrCreateSystemConversation(
        db,
        parentUserId
      );

      // ── Batch write: message + conv summary + userChat + dedup ─────────────
      const batch = db.batch();

      // 1. System chat message
      const messageRef = db
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .doc();

      batch.set(messageRef, {
        senderId: SYSTEM_SENDER_ID,
        senderName: SYSTEM_SENDER_NAME,
        text: reminderText,
        messageType: "system",
        subtype: "fee_reminder",
        metadata: {
          feeStructureId: inst.feeStructureId,
          feeInstallmentId: inst.feeInstallmentId,
          studentFeeInstallmentId: instId,
          installmentName: inst.installmentName,
          amount: pendingAmount,
          dueDate: inst.dueDate,
          branchId: inst.branchId,
          studentId: inst.studentId,
          studentName,
          reminderType,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Update conversation lastMessage
      const convRef = db.collection("conversations").doc(conversationId);
      batch.update(convRef, {
        lastMessage: reminderText,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Update parent's userChat unread count
      const parentUserChatRef = db
        .collection("userChats")
        .doc(parentUserId)
        .collection("conversations")
        .doc(conversationId);
      batch.set(
        parentUserChatRef,
        {
          lastMessage: reminderText,
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          unreadCount: admin.firestore.FieldValue.increment(1),
        },
        { merge: true }
      );

      // 4. Write dedup record
      batch.set(dedupeRef, {
        dedupeKey,
        studentId: inst.studentId,
        feeInstallmentId: inst.feeInstallmentId,
        feeStructureId: inst.feeStructureId,
        reminderType,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        dateSent: todayISO,
      });

      await batch.commit();
      console.info(
        `[FeeReminder] Sent "${reminderType}" to parent ${parentUserId} for ${studentName}`
      );

      // ── FCM Push (non-blocking) ────────────────────────────────────────────
      await _sendFcmToParent(parentUser, studentName, reminderText, conversationId);
    } catch (err) {
      // Non-blocking: log and continue with remaining installments
      console.error(`[FeeReminder] Failed for installment ${instId}:`, err);
    }
  }
}

// ─── Determine reminder type based on days until due ─────────────────────────

function _getReminderType(dueDateISO: string, now: Date): string | null {
  const due = new Date(dueDateISO);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Overdue: past due date, up to OVERDUE_REMINDER_DAYS after
  if (diffDays < 0 && Math.abs(diffDays) <= OVERDUE_REMINDER_DAYS) {
    return `overdue_day${Math.abs(diffDays)}`;
  }

  // Due today
  if (diffDays === 0) return "due_today";

  // Upcoming: within the REMINDER_START_DAYS_BEFORE window
  if (diffDays > 0 && diffDays <= REMINDER_START_DAYS_BEFORE) {
    return `due_in_${diffDays}d`;
  }

  return null;
}

// ─── Get or create system→parent conversation ────────────────────────────────

async function _getOrCreateSystemConversation(
  db: admin.firestore.Firestore,
  parentUserId: string
): Promise<string> {
  // Deterministic conversation ID
  const conversationId = [SCHOOL_SYSTEM_UID, parentUserId].sort().join("_");
  const convRef = db.collection("conversations").doc(conversationId);
  const convSnap = await convRef.get();

  if (convSnap.exists) return conversationId;

  // Create conversation + seed parent's userChat entry
  const batch = db.batch();

  batch.set(convRef, {
    type: "direct",
    name: "School Notifications",
    participants: [SCHOOL_SYSTEM_UID, parentUserId],
    admins: [SCHOOL_SYSTEM_UID],
    lastMessage: "",
    lastMessageAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: SCHOOL_SYSTEM_UID,
  });

  batch.set(
    db
      .collection("userChats")
      .doc(parentUserId)
      .collection("conversations")
      .doc(conversationId),
    {
      name: "School Notifications",
      type: "direct",
      lastMessage: "",
      lastMessageAt: null,
      unreadCount: 0,
      lastSeenAt: null,
      avatarLetter: "S",
      roleLabel: "School System",
    }
  );

  await batch.commit();
  console.info(
    `[FeeReminder] Created system conversation ${conversationId} for parent ${parentUserId}`
  );

  return conversationId;
}

// ─── Build reminder message text ─────────────────────────────────────────────

function _buildReminderText(
  reminderType: string,
  studentName: string,
  installmentName: string,
  amount: string,
  dueDate: string
): string {
  if (reminderType.startsWith("overdue")) {
    return `⚠️ Fee Overdue: ${installmentName} of ${amount} for ${studentName} was due on ${dueDate}. Please make the payment at the earliest to avoid late fees.`;
  }
  if (reminderType === "due_today") {
    return `🔔 Fee Due Today: ${installmentName} of ${amount} for ${studentName} is due today (${dueDate}). Please complete the payment.`;
  }
  // due_in_Xd
  const days = reminderType.replace("due_in_", "").replace("d", "");
  return `📅 Fee Reminder: ${installmentName} of ${amount} for ${studentName} is due in ${days} day${days === "1" ? "" : "s"} on ${dueDate}.`;
}

// ─── Format ISO date → readable string ───────────────────────────────────────

function _formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

// ─── Send FCM push to parent ─────────────────────────────────────────────────

async function _sendFcmToParent(
  parentUser: UserRecord,
  studentName: string,
  body: string,
  conversationId: string
): Promise<void> {
  const fcmToken = parentUser.fcmToken;
  if (!fcmToken) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: `Fee Reminder — ${studentName}`,
        body,
      },
      data: {
        conversationId,
        type: "fee_reminder",
      },
      android: {
        priority: "normal",
        notification: { channelId: "fee_reminders" },
      },
      apns: {
        payload: { aps: { "content-available": 1 } },
      },
    });
  } catch (err) {
    // Non-blocking — FCM failure must not prevent dedup write
    console.warn("[FeeReminder] FCM send failed:", err);
  }
}
