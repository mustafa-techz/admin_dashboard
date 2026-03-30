import { getFirestore } from "firebase/firestore";
import { app } from "./firebaseConfig";

export const db = getFirestore(app);
console.log("🔥 Firestore Initialized:", db.app.name);
