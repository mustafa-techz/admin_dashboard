import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BranchInfo {
  id: string;
  branchName: string;
}

interface BranchState {
  selectedBranch: BranchInfo | null;
  selectedBranchId: string;
  setSelectedBranch: (branch: BranchInfo) => void;
  clearBranch: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranch: null,
      selectedBranchId: '',
      setSelectedBranch: (branch) =>
        set({ selectedBranch: branch, selectedBranchId: branch.id }),
      clearBranch: () =>
        set({ selectedBranch: null, selectedBranchId: '' }),
    }),
    {
      name: 'branch-storage',
    }
  )
);
