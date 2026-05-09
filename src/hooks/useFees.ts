import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feeService } from '@/services/feeService';
import { useAuthStore } from '@/store/authStore';
import type {
  FeeStructureFormData,
  FeeInstallmentFormData,
  RecordPaymentData,
  FeeStructure,
  FeeInstallment,
} from '@/types/fees';

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
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      data,
      installments,
    }: {
      data: FeeStructureFormData;
      installments: FeeInstallmentFormData[];
    }) => feeService.createFeeStructure(data, installments, user?.id ?? ''),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: feeKeys.structures(variables.data.branchId),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeKeys.all });
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
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (paymentData: RecordPaymentData) =>
      feeService.recordPayment(paymentData, user?.id ?? ''),
    onSuccess: (_, variables) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: feeKeys.studentInstallments(variables.studentId, variables.feeStructureId),
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.studentAssignments(variables.studentId),
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.pendingInstallments(variables.studentId),
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.paymentHistory(variables.studentFeeInstallmentId),
      });
      queryClient.invalidateQueries({
        queryKey: feeKeys.branchAssignments(variables.branchId),
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

  return useMutation({
    mutationFn: (feeStructureId: string) => feeService.deleteFeeStructure(feeStructureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeKeys.all });
    },
  });
}

export function useDeleteStudentFeeAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => feeService.deleteStudentFeeAssignment(assignmentId),
    onSuccess: () => {
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
