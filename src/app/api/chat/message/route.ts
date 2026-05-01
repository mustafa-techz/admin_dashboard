/**
 * POST /api/chat/message
 *
 * Fan-out handler — called by the client after writing a message to Firestore.
 * Uses Firebase Admin SDK to:
 *  1. Update conversations/{id} with lastMessage + lastMessageAt
 *  2. Batch-update all participants' userChats/{uid}/conversations/{id}
 *     - increment unreadCount (skip sender)
 *     - set lastMessage + lastMessageAt
 *  3. Send FCM push notification (multicast to fcmTokens or topic)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthRequest } from "@/lib/serverAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { MessageFanoutPayload } from "@/types/chat";

// Optional: FCM via Admin SDK
let messagingAdmin: ReturnType<typeof import("firebase-admin/messaging").getMessaging> | null = null;
const getMessagingAdmin = async () => {
  if (messagingAdmin) return messagingAdmin;
  try {
    const { getMessaging } = await import("firebase-admin/messaging");
    const { getApps } = await import("firebase-admin/app");
    if (getApps().length > 0) {
      messagingAdmin = getMessaging(getApps()[0]);
    }
  } catch {
    // FCM Admin not configured — skip push notifications
  }
  return messagingAdmin;
};

export async function POST(request: NextRequest) {
  // Verify the caller is authenticated (any role)
  const authResult = await requireAuthRequest(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: MessageFanoutPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    conversationId,
    senderId,
    senderName,
    text,
    participants,
    conversationType,
    conversationName,
  } = payload;

  if (!conversationId || !senderId || !participants?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const now = FieldValue.serverTimestamp();
  const previewText = text || "📷 Image";

  try {
    const batch = dbAdmin.batch();

    // 1. Update conversation document
    const convRef = dbAdmin.collection("conversations").doc(conversationId);
    batch.update(convRef, {
      lastMessage: previewText,
      lastMessageAt: now,
    });

    // 2. Update each participant's userChats entry
    for (const uid of participants) {
      const userChatRef = dbAdmin
        .collection("userChats")
        .doc(uid)
        .collection("conversations")
        .doc(conversationId);

      if (uid === senderId) {
        // Reset unread count for the sender
        batch.update(userChatRef, {
          lastMessage: previewText,
          lastMessageAt: now,
          unreadCount: 0,
        });
      } else {
        // Increment unread count for recipients
        batch.update(userChatRef, {
          lastMessage: previewText,
          lastMessageAt: now,
          unreadCount: FieldValue.increment(1),
        });
      }
    }

    await batch.commit();

    // 3. Send FCM push notification
    try {
      const messaging = await getMessagingAdmin();
      if (messaging) {
        const recipientUids = participants.filter((uid) => uid !== senderId);

        if (conversationType === "broadcast" || conversationType === "group") {
          // Use topics for groups — avoids per-token multicast cost
          const topic =
            conversationType === "broadcast"
              ? "parents"
              : `group_${conversationId}`;

          await messaging.send({
            topic,
            notification: {
              title: conversationName ?? senderName,
              body: `${senderName}: ${previewText}`,
            },
            data: { conversationId },
          });
        } else {
          // Direct chat — multicast to recipient tokens
          if (recipientUids.length > 0) {
            const tokenDocs = await Promise.all(
              recipientUids.map((uid) =>
                dbAdmin.collection("users").doc(uid).get()
              )
            );
            const tokens = tokenDocs
              .map((d) => d.data()?.fcmToken as string | undefined)
              .filter((t): t is string => Boolean(t));

            if (tokens.length > 0) {
              await messaging.sendEachForMulticast({
                tokens,
                notification: {
                  title: senderName,
                  body: previewText,
                },
                data: { conversationId },
              });
            }
          }
        }
      }
    } catch (fcmErr) {
      // FCM errors must not break the fan-out response
      console.error("FCM push failed (non-fatal):", fcmErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chat fan-out failed:", error);
    return NextResponse.json({ error: "Fan-out failed" }, { status: 500 });
  }
}
