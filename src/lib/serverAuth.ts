import { authAdmin, dbAdmin } from "@/lib/firebaseAdmin";
import { normalizeUserRole } from "@/types/user";
import { NextResponse } from "next/server";

const getTokenFromRequest = (request: Request) => {
  const authorizationHeader = request.headers.get("authorization");
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length);
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const authCookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("firebase-auth-token="));

  return authCookie ? decodeURIComponent(authCookie.split("=")[1] ?? "") : null;
};

export const requireAdminRequest = async (request: Request) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const decodedToken = await authAdmin.verifyIdToken(token);
    const claimedRole = normalizeUserRole(decodedToken.role);

    let role = claimedRole;
    if (!role) {
      const userDoc = await dbAdmin.collection("users").doc(decodedToken.uid).get();
      role = normalizeUserRole(userDoc.data()?.role);
    }

    if (role !== "admin") {
      console.warn(`Access denied for user ${decodedToken.uid}: Role is ${role}`);
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return {
      ok: true as const,
      uid: decodedToken.uid,
      role,
    };
  } catch (error) {
    console.error("Failed to verify admin request:", error);
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
};
