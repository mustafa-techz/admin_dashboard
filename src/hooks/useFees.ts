import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feeService } from '@/services/feeService';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import type {
  FeeStructureFormData,
  FeeInstallmentFormData,
  RecordPaymentData,
  FeeStructure,
  FeeInstallment,
  StudentFeeAssignment,
} from '@/types/fees';
import { prependActivityCache, syncFeePaymentCache } from '@/lib/dashboardCacheSync';

// ─────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────
export const feeKeys = {
  all: ['fees'] as const,
  structures: (branchId: string) => [...feeKeys.all, 'structures', branchId] as const,
  structureById: (id: string) => [...feeKeys.all, 'structure', id] as const,
  installments: (feeStructureId: string) => [...feeKeys.all, 'installments', feeStructureId] as const,
  studentAssignments: (studentId: string) => [...feeKeys.all, 'studentAssignments', studentId] as const,
  branchAssignments: (branchId: string, feeStructureId?: string) =>
    [...feeKeys.all, 'branchAssignments', branchId, feeStructureId ?? 'all'] as const,
  studentInstallments: (studentId: string, feeStructureId: string) =>
    [...feeKeys.all, 'studentInstallments', studentId, feeStructureId] as const,
  pendingInstallments: (studentId: string) => [...feeKeys.all, 'pendingInstallments', studentId] as const,
  paymentHistory: (sfiId: string) => [...feeKeys.all, 'payments', sfiId] as const,
  studentPayments: (studentId: string) => [...feeKeys.all, 'studentPayments', studentId] as const,
};

// ─────────────────────────────────────────────────────────────────
// Fee Structures
// ─────────────────────────────────────────────────────────────────
export function useFeeStructures(branchId: string) {
  return useQuery({
    queryKey: feeKeys.structures(branchId),
    queryFn: () => feeService.getFeeStructures(branchId),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useFeeStructureById(id: string) {
  return useQuery({
    queryKey: feeKeys.structureById(id),
    queryFn: () => feeService.getFeeStructureById(id),
    enabled: !!id,
  });
}

export function useCreateFeeStructure() {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  return useMutation({
    mutationFn: ({
      data,
      installments,
    }: {
      data: FeeStructureFormData;
      installments: FeeInstallmentFormData[];
    }) => feeService.createFeeStructure(data, installments, user?.id ?? ''),
    onSuccess: (feeStructureId, variables) => {
      const createdAt = new Date().toISOString();
      const feeStructure: FeeStructure = {
        id: feeStructureId,
        feeName: variables.data.feeName,
        academicYear: variables.data.academicYear,
        totalAmount: variables.data.totalAmount,
        splitType: variables.data.splitType,
        installmentCount: variables.installments.length,
        branchId: variables.data.branchId,
        status: 'active',
        createdBy: user?.id ?? '',
        createdAt,
        updatedAt: createdAt,
      };

      queryClient.setQueryData<FeeStructure[]>(
        feeKeys.structures(variables.data.branchId),
        (old = []) => [feeStructure, ...old.filter((item) => item.id !== feeStructureId)]
      );
      prependActivityCache(queryClient, {
        action: 'fee_created',
        entityType: 'feeStructure',
        entityId: feeStructureId,
        branchId: variables.data.branchId,
        metadata: { feeName: variables.data.feeName, amount: variables.data.totalAmount },
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.structures(variables.data.branchId),
        refetchType: 'none',
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Installments
// ─────────────────────────────────────────────────────────────────
export function useFeeInstallments(feeStructureId: string) {
  return useQuery({
    queryKey: feeKeys.installments(feeStructureId),
    queryFn: () => feeService.getFeeInstallments(feeStructureId),
    enabled: !!feeStructureId,
  });
}

// ─────────────────────────────────────────────────────────────────
// Student Fee Assignments
// ─────────────────────────────────────────────────────────────────
export function useStudentFeeAssignments(studentId: string) {
  return useQuery({
    queryKey: feeKeys.studentAssignments(studentId),
    queryFn: () => feeService.getStudentFeeAssignments(studentId),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useBranchFeeAssignments(branchId: string, feeStructureId?: string) {
  return useQuery({
    queryKey: feeKeys.branchAssignments(branchId, feeStructureId),
    queryFn: () => feeService.getBranchFeeAssignments(branchId, feeStructureId),
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAssignFeeToStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      students,
      feeStructure,
      installments,
    }: {
      students: Array<{ id: string; fullName: string; userId: string }>;
      feeStructure: FeeStructure;
      installments: FeeInstallment[];
    }) => feeService.assignFeeToStudents(students, feeStructure, installments),
    onSuccess: (assignments, variables) => {
      const assignedStudentIds = new Set(assignments.map((assignment) => assignment.studentId));
      queryClient.setQueryData<StudentFeeAssignment[]>(
        feeKeys.branchAssignments(variables.feeStructure.branchId),
        (old = []) => [
          ...assignments,
          ...old.filter((item) => !assignedStudentIds.has(item.studentId)),
        ]
      );

      prependActivityCache(queryClient, {
        action: 'fee_created',
        entityType: 'studentFeeAssignment',
        entityId: variables.feeStructure.id,
        branchId: variables.feeStructure.branchId,
        metadata: {
          feeName: variables.feeStructure.feeName,
          studentsCount: variables.students.length,
        },
      });
      queryClient.invalidateQueries({ queryKey: feeKeys.all, refetchType: 'none' });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Student Fee Installments
// ─────────────────────────────────────────────────────────────────
export function useStudentFeeInstallments(studentId: string, feeStructureId: string) {
  return useQuery({
    queryKey: feeKeys.studentInstallments(studentId, feeStructureId),
    queryFn: () => feeService.getStudentFeeInstallments(studentId, feeStructureId),
    enabled: !!studentId && !!feeStructureId,
  });
}

// ─────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────
export function useRecordPayment() {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  return useMutation({
    mutationFn: (paymentData: RecordPaymentData) =>
      feeService.recordPayment(paymentData, user?.id ?? ''),
    onSuccess: (paymentId, variables) => {
      syncFeePaymentCache(queryClient, paymentId, variables);

      queryClient.invalidateQueries({
        queryKey: feeKeys.studentInstallments(variables.studentId, variables.feeStructureId),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.studentAssignments(variables.studentId),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.pendingInstallments(variables.studentId),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.paymentHistory(variables.studentFeeInstallmentId),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.branchAssignments(variables.branchId),
        refetchType: 'none',
      });
    },
  });
}

export function usePaymentHistory(studentFeeInstallmentId: string) {
  return useQuery({
    queryKey: feeKeys.paymentHistory(studentFeeInstallmentId),
    queryFn: () => feeService.getPaymentHistory(studentFeeInstallmentId),
    enabled: !!studentFeeInstallmentId,
  });
}

export function useStudentPayments(studentId: string) {
  return useQuery({
    queryKey: feeKeys.studentPayments(studentId),
    queryFn: () => feeService.getStudentPayments(studentId),
    enabled: !!studentId,
  });
}

// ─────────────────────────────────────────────────────────────────
// Delete Hooks
// ─────────────────────────────────────────────────────────────────

export function useDeleteFeeStructure() {
  const queryClient = useQueryClient();

  const selectedBranchId = useBranchStore(state => state.selectedBranchId);

  return useMutation({
    mutationFn: (feeStructureId: string) => feeService.deleteFeeStructure(feeStructureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeKeys.structures(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: feeKeys.branchAssignments(selectedBranchId) });
    },
  });
}

export function useDeleteStudentFeeAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId }: { assignmentId: string; studentId: string }) => feeService.deleteStudentFeeAssignment(assignmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: feeKeys.studentAssignments(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: feeKeys.pendingInstallments(variables.studentId) });
      // Invalidate the branch assignments cache to update summary charts in AdminStudentFeeOverview
      queryClient.invalidateQueries({ queryKey: feeKeys.all }); 
    },
  });
}

export function usePendingFeeInstallments(studentId: string) {
  return useQuery({
    queryKey: feeKeys.pendingInstallments(studentId),
    queryFn: () => feeService.getAllPendingStudentFeeInstallments(studentId),
    enabled: !!studentId,
  });
}
