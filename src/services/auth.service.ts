import { auth } from "@/firebase/auth";
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  UserCredential
} from "firebase/auth";

/**
 * Log in a user with email and password
 */
export const loginUser = async (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Register a new user with email and password
 */
export const registerUser = async (email: string, password: string): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Log out the current user
 */
export const logoutUser = async (): Promise<void> => {
  return signOut(auth);
};
