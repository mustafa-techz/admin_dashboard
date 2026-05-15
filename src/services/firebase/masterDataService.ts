import { ClassMaster, SectionMaster, BranchMaster } from "../../types/masterData";
import { createFirestoreService } from "@/lib/firestore-service";

const _classService = createFirestoreService<ClassMaster>("classes", "className");
const _sectionService = createFirestoreService<SectionMaster>("sections", "sectionName");
const _branchService = createFirestoreService<BranchMaster>("branches", "branchName");

export const classService = {
  getClasses: _classService.getAll,
  addClass: _classService.add,
  updateClass: _classService.update,
  deleteClass: _classService.delete,
};

export const sectionService = {
  getSections: _sectionService.getAll,
  addSection: _sectionService.add,
  updateSection: _sectionService.update,
  deleteSection: _sectionService.delete,
};

export const branchService = {
  getBranches: _branchService.getAll,
  addBranch: _branchService.add,
  updateBranch: _branchService.update,
  deleteBranch: _branchService.delete,
};
