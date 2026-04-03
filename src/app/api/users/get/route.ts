import { dbAdmin } from "@/lib/firebaseAdmin";
import { requireAdminRequest } from "@/lib/serverAuth";
import { normalizeUserRole } from "@/types/user";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const usersSnapshot = await dbAdmin.collection("users").orderBy("createdAt", "desc").get();
    const users = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
      role: normalizeUserRole(doc.data().role) ?? "admin",
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
