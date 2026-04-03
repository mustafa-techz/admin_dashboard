import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const getFirebaseAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  console.log("testinggggg", {
    projectId,
    clientEmail,
    privateKey: privateKey?.slice(0, 30)
  })
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
};

const firebaseAdminApp = getFirebaseAdminApp();

export const authAdmin = getAuth(firebaseAdminApp);
export const dbAdmin = getFirestore(firebaseAdminApp);
