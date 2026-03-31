export interface ClassMaster {
  id: string; // Firestore document ID
  classId: string;
  className: string;
}

export interface SectionMaster {
  id: string; // Firestore document ID
  sectionId: string;
  sectionName: string;
}

export interface BranchMaster {
  id: string; // Firestore document ID
  branchId: string;
  branchName: string;
}
