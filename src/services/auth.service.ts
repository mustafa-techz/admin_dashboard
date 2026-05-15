import { auth } from "@/firebase/auth";
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  UserCredential
} from "firebase/auth";
import { executeFirebaseOp } from "@/lib/api-errors";

/**
 * Log in a user with email and password
 */
export const loginUser = async (email: string, password: string): Promise<UserCredential> => {
  return executeFirebaseOp(() => signInWithEmailAndPassword(auth, email, password), 'loginUser');
};

/**
 * Register a new user with email and password
 */
export const registerUser = async (email: string, password: string): Promise<UserCredential> => {
  return executeFirebaseOp(() => createUserWithEmailAndPassword(auth, email, password), 'registerUser');
};

/**
 * Log out the current user
 */
export const logoutUser = async (): Promise<void> => {
  return executeFirebaseOp(() => signOut(auth), 'logoutUser');
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  return executeFirebaseOp(() => sendPasswordResetEmail(auth, email), 'resetPassword');
};
