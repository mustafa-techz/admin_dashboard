/**
 * GET /api/chat/conversations?userId=<uid>
 *
 * Server-side alternative to client-SDK chat list fetch.
 * Returns the userChats list for the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthRequest } from "@/lib/serverAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  const authResult = await requireAuthRequest(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  // Only allow a user to fetch their own chat list
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId || userId !== authResult.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const snap = await dbAdmin
      .collection("userChats")
      .doc(userId)
      .collection("conversations")
      .orderBy("lastMessageAt", "desc")
      .limit(50)
      .get();

    const conversations = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      // Convert Firestore timestamps to serializable format
      lastMessageAt: d.data().lastMessageAt?.toMillis?.() ?? null,
      lastSeenAt: d.data().lastSeenAt?.toMillis?.() ?? null,
    }));

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
