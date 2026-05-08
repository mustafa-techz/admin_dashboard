// ─────────────────────────────────────────────────────────────────
// Fee Management Types
// ─────────────────────────────────────────────────────────────────

export type PaymentMode = 'cash' | 'upi' | 'cheque' | 'bank_transfer' | 'card' | 'online';

export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export type FeeStructureStatus = 'active' | 'archived';

export type SplitType = 'auto' | 'custom';

// ─────────────────────────────────────────────────────────────────
// Firestore: feeStructures/{feeStructureId}
// ─────────────────────────────────────────────────────────────────
export interface FeeStructure {
  id: string;
  feeName: string;
  academicYear: string;
  totalAmount: number;
  splitType: SplitType;
  installmentCount: number;
  branchId: string;
  status: FeeStructureStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FeeStructureFormData {
  feeName: string;
  academicYear: string;
  totalAmount: number;
  splitType: SplitType;
  installmentCount: number;
  branchId: string;
}

// ─────────────────────────────────────────────────────────────────
// Firestore: feeInstallments/{feeInstallmentId}
// ─────────────────────────────────────────────────────────────────
export interface FeeInstallment {
  id: string;
  feeStructureId: string;
  installmentName: string;
  amount: number;
  dueDate: string; // ISO date string
  order: number;    // for sorting
  branchId: string;
}

export interface FeeInstallmentFormData {
  installmentName: string;
  amount: number;
  dueDate: string;
}

// ─────────────────────────────────────────────────────────────────
// Firestore: studentFeeAssignments/{assignmentId}
// Aggregate document per student per fee structure
// ─────────────────────────────────────────────────────────────────
export interface StudentFeeAssignment {
  id: string;
  studentId: string;
  studentName: string;
  feeStructureId: string;
  branchId: string;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  status: InstallmentStatus; // overall status
  createdAt: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────
// Firestore: studentFeeInstallments/{studentFeeInstallmentId}
// Per-student per-installment tracking
// ─────────────────────────────────────────────────────────────────
export interface StudentFeeInstallment {
  id: string;
  studentId: string;
  feeStructureId: string;
  feeInstallmentId: string;
  installmentName: string;
  amount: number;
  amountPaid: number;
  amountPending: number;
  dueDate: string;
  status: InstallmentStatus;
  order: number;
  branchId: string;
  lastPaymentDate?: string;
  lastPaymentMode?: PaymentMode;
}

// ─────────────────────────────────────────────────────────────────
// Firestore: payments/{paymentId}
// Individual payment records
// ─────────────────────────────────────────────────────────────────
export interface Payment {
  id: string;
  studentId: string;
  feeStructureId: string;
  feeInstallmentId: string;
  studentFeeInstallmentId: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  notes?: string;
  branchId: string;
  recordedBy: string; // admin/sub-admin uid
  createdAt: string;
}

export interface RecordPaymentData {
  studentId: string;
  feeStructureId: string;
  feeInstallmentId: string;
  studentFeeInstallmentId: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  notes?: string;
  branchId: string;
}

// ─────────────────────────────────────────────────────────────────
// UI Helper Types
// ─────────────────────────────────────────────────────────────────
export interface FeeOverview {
  feeStructure: FeeStructure;
  assignment: StudentFeeAssignment;
  installments: StudentFeeInstallment[];
}

export interface CountdownInfo {
  label: string;
  days: number;
  type: 'future' | 'today' | 'overdue';
}

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: 'Cash',
  upi: 'UPI',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  online: 'Online',
};

export const PAYMENT_MODES: PaymentMode[] = [
  'cash', 'upi', 'cheque', 'bank_transfer', 'card', 'online'
];

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
};
