import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { ClassMaster, SectionMaster, BranchMaster } from "../../types/masterData";

export const classService = {
  async getClasses(): Promise<ClassMaster[]> {
    const classCol = collection(db, "classes");
    const q = query(classCol, orderBy("className"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ClassMaster[];
  },

  async addClass(data: Omit<ClassMaster, 'id'>) {
    const classCol = collection(db, "classes");
    return await addDoc(classCol, data);
  },

  async updateClass(id: string, data: Partial<ClassMaster>) {
    const docRef = doc(db, "classes", id);
    return await updateDoc(docRef, data);
  },

  async deleteClass(id: string) {
    const docRef = doc(db, "classes", id);
    return await deleteDoc(docRef);
  }
};

export const sectionService = {
  async getSections(): Promise<SectionMaster[]> {
    const sectionCol = collection(db, "sections");
    const q = query(sectionCol, orderBy("sectionName"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SectionMaster[];
  },

  async addSection(data: Omit<SectionMaster, 'id'>) {
    const sectionCol = collection(db, "sections");
    return await addDoc(sectionCol, data);
  },

  async updateSection(id: string, data: Partial<SectionMaster>) {
    const docRef = doc(db, "sections", id);
    return await updateDoc(docRef, data);
  },

  async deleteSection(id: string) {
    const docRef = doc(db, "sections", id);
    return await deleteDoc(docRef);
  }
};

export const branchService = {
  async getBranches(): Promise<BranchMaster[]> {
    const branchCol = collection(db, "branches");
    const q = query(branchCol, orderBy("branchName"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BranchMaster[];
  },

  async addBranch(data: Omit<BranchMaster, 'id'>) {
    const branchCol = collection(db, "branches");
    return await addDoc(branchCol, data);
  },

  async updateBranch(id: string, data: Partial<BranchMaster>) {
    const docRef = doc(db, "branches", id);
    return await updateDoc(docRef, data);
  },

  async deleteBranch(id: string) {
    const docRef = doc(db, "branches", id);
    return await deleteDoc(docRef);
  }
};
