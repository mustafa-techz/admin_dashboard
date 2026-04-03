import { authAdmin, dbAdmin } from "@/lib/firebaseAdmin";
import { requireAdminRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Failed to delete user";
};

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) {
      return authResult.response;
    }

    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "User UID is required" }, { status: 400 });
    }

    if (authResult.uid === uid) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    await authAdmin.deleteUser(uid);
    await dbAdmin.collection("users").doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
