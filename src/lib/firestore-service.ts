import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  QueryConstraint,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { executeFirebaseOp } from "./api-errors";

/**
 * Generic Firestore Service Factory
 * Standardizes CRUD operations, error handling, and type safety across the app.
 */
export function createFirestoreService<T extends { id?: string }>(
  collectionName: string,
  defaultSortField?: string
) {
  const colRef = collection(db, collectionName);

  return {
    async getAll(constraintsOrContext?: any): Promise<T[]> {
      return executeFirebaseOp(async () => {
        const constraints = Array.isArray(constraintsOrContext) ? constraintsOrContext : [];
        let q = query(colRef, ...constraints);
        if (defaultSortField && constraints.length === 0) {
          q = query(colRef, orderBy(defaultSortField));
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
      }, `get_all_${collectionName}`);
    },

    async getById(id: string): Promise<T | null> {
      return executeFirebaseOp(async () => {
        const docRef = doc(db, collectionName, id);
        const snapshot = await getDoc(docRef);
        
        if (!snapshot.exists()) return null;
        
        return {
          id: snapshot.id,
          ...snapshot.data()
        } as T;
      }, `get_by_id_${collectionName}`);
    },

    async add(data: Omit<T, 'id'>): Promise<string> {
      return executeFirebaseOp(async () => {
        const docRef = await addDoc(colRef, data as any);
        return docRef.id;
      }, `add_${collectionName}`);
    },

    async update(id: string, data: Partial<T>): Promise<void> {
      return executeFirebaseOp(async () => {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, data as any);
      }, `update_${collectionName}`);
    },

    async delete(id: string): Promise<void> {
      return executeFirebaseOp(async () => {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
      }, `delete_${collectionName}`);
    }
  };
}
