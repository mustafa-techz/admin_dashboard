import { authAdmin, dbAdmin } from "@/lib/firebaseAdmin";
import { requireAdminRequest } from "@/lib/serverAuth";
import { isUserRole } from "@/types/user";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Failed to update user";
};

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) {
      return authResult.response;
    }

    const { uid, name, email, role } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "User UID is required" }, { status: 400 });
    }

    if (role !== undefined && !isUserRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const authUpdates: { displayName?: string; email?: string } = {};
    if (typeof name === "string" && name.trim()) {
      authUpdates.displayName = name.trim();
    }
    if (typeof email === "string" && email.trim()) {
      authUpdates.email = email.trim();
    }

    if (Object.keys(authUpdates).length > 0) {
      await authAdmin.updateUser(uid, authUpdates);
    }

    if (role) {
      await authAdmin.setCustomUserClaims(uid, { role });
    }

    const firestoreUpdates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (typeof name === "string" && name.trim()) {
      firestoreUpdates.name = name.trim();
    }
    if (typeof email === "string" && email.trim()) {
      firestoreUpdates.email = email.trim();
    }
    if (role) {
      firestoreUpdates.role = role;
    }

    await dbAdmin.collection("users").doc(uid).update(firestoreUpdates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
