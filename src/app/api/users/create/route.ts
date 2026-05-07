import { authAdmin, dbAdmin } from "@/lib/firebaseAdmin";
import { requireAdminRequest } from "@/lib/serverAuth";
import { isUserRole } from "@/types/user";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Failed to create user";
};

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) {
      return authResult.response;
    }

    const { name, email, password, role, classTeacherOf, studentRollNumber } = await req.json();

    if (!name || !email || !password || !isUserRole(role)) {
      return NextResponse.json(
        { error: "Name, email, password, and a valid role are required." },
        { status: 400 }
      );
    }

    const user = await authAdmin.createUser({
      email,
      password,
      displayName: name,
    });

    await authAdmin.setCustomUserClaims(user.uid, { role });

    // Build user document with optional lightweight metadata
    const userData: Record<string, unknown> = {
      name,
      email,
      role,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Teacher: store classTeacherOf (e.g. "10-A") if assigned
    if (role === "teacher" && classTeacherOf) {
      userData.classTeacherOf = classTeacherOf;
    }

    // Parent: store student's roll number for chat label
    if (role === "parent" && studentRollNumber) {
      userData.studentRollNumber = studentRollNumber;
    }

    await dbAdmin.collection("users").doc(user.uid).set(userData);

    return NextResponse.json({ success: true, uid: user.uid });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
