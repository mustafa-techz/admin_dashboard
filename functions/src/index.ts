import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Triggered on message creation in any conversation.
 * Handles denormalization (fan-out) to userChats and sends FCM notifications.
 */
export const onMessageCreate = functions.firestore
  .document("conversations/{conversationId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
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
