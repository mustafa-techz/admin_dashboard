import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { ClassMaster, SectionMaster, BranchMaster } from "../../types/masterData";

export const classService = {
  async getClasses(): Promise<ClassMaster[]> {
    const classCol = collection(db, "classes");
    const q = query(classCol, orderBy("className"));
    const snapshot = await getDocs(q);
    console.log('Classes: inside api', snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ClassMaster[];
  },

  async addClass(data: Omit<ClassMaster, 'id'>) {
    const classCol = collection(db, "classes");
    return await addDoc(classCol, data);
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
  }
};
