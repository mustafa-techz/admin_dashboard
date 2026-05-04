import { create } from 'zustand';
import { AttendanceStatus } from '../types/attendance';

interface AttendanceDraftState {
  drafts: Record<string, AttendanceStatus>;
  setStatus: (studentId: string, status: AttendanceStatus) => void;
  markAll: (studentIds: string[], status: AttendanceStatus) => void;
  clearDrafts: () => void;
  getChanges: (committedAttendance: Record<string, AttendanceStatus>) => Record<string, AttendanceStatus>;
}

export const useAttendanceDraftStore = create<AttendanceDraftState>((set, get) => ({
  drafts: {},
  setStatus: (studentId, status) =>
    set((state) => ({
      drafts: { ...state.drafts, [studentId]: status },
    })),
  markAll: (studentIds, status) =>
    set((state) => {
      const newDrafts = { ...state.drafts };
      studentIds.forEach((id) => {
        newDrafts[id] = status;
      });
      return { drafts: newDrafts };
    }),
  clearDrafts: () => set({ drafts: {} }),
  getChanges: (committedAttendance) => {
    const changes: Record<string, AttendanceStatus> = {};
    const { drafts } = get();
    for (const [id, status] of Object.entries(drafts)) {
      if (committedAttendance[id] !== status) {
        changes[id] = status;
      }
    }
    return changes;
  },
}));
