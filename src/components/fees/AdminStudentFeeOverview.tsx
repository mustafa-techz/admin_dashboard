'use client';

import { useState, useMemo } from 'react';
import {
  useBranchFeeAssignments,
  useFeeStructures,
  useStudentFeeInstallments,
} from '@/hooks/useFees';
import { useQuery } from '@tanstack/react-query';
import { formatINR } from '@/lib/feeUtils';
import { getCountdownInfo } from '@/lib/feeUtils';
import { cn } from '@/lib/utils';
import type { StudentFeeAssignment, StudentFeeInstallment } from '@/types/fees';
import { PAYMENT_MODE_LABELS } from '@/types/fees';
import RecordPaymentModal from './RecordPaymentModal';
import {
  IndianRupee,
  ArrowLeft,
  Check,
  Clock,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Trash2,
} from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useDeleteStudentFeeAssignment } from '@/hooks/useFees';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─────────────────────────────────────────────────────────────────
// Student Detail View
// ─────────────────────────────────────────────────────────────────
function StudentFeeDetail({
  assignment,
  onBack,
}: {
  assignment: StudentFeeAssignment;
  onBack: () => void;
}) {
  const { data: installments = [], isLoading } = useStudentFeeInstallments(
    assignment.studentId,
    assignment.feeStructureId
  );
  const [payingInstallment, setPayingInstallment] = useState<StudentFeeInstallment | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteStudentFeeAssignment();

  const percentage =
    assignment.totalAmount > 0
      ? Math.round((assignment.totalPaid / assignment.totalAmount) * 100)
      : 0;

  const handleDelete = () => {
    deleteMutation.mutate(assignment.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        onBack();
      }
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Back Button + Header */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} /> Back to List
      </button>

      {/* Summary Card */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-black text-foreground">{assignment.studentName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Fee Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                assignment.status === 'paid' && 'bg-emerald-100 text-emerald-700',
                assignment.status === 'partial' && 'bg-blue-100 text-blue-700',
                assignment.status === 'pending' && 'bg-amber-100 text-amber-700',
                assignment.status === 'overdue' && 'bg-red-100 text-red-700'
              )}
            >
              {assignment.status === 'paid' && <Check size={12} />}
              {assignment.status}
            </span>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-background rounded-xl p-3 text-center border border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total</p>
            <p className="text-lg font-black">{formatINR(assignment.totalAmount)}</p>
          </div>
          <div className="bg-emerald-50/60 rounded-xl p-3 text-center border border-emerald-200/50">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Paid</p>
            <p className="text-lg font-black text-emerald-700">{formatINR(assignment.totalPaid)}</p>
          </div>
          <div className="bg-amber-50/60 rounded-xl p-3 text-center border border-amber-200/50">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Pending</p>
            <p className="text-lg font-black text-amber-700">{formatINR(assignment.totalPending)}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-muted-foreground">{percentage}% paid</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                percentage >= 100
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : percentage >= 50
                  ? 'bg-gradient-to-r from-primary to-primary/80'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Installments */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Installments</h4>
          {installments.map((inst) => {
            const countdown = inst.status !== 'paid' ? getCountdownInfo(inst.dueDate) : null;
            const isPaid = inst.status === 'paid';

            return (
              <div
                key={inst.id}
                className={cn(
                  'rounded-2xl border p-5 transition-all',
                  isPaid
                    ? 'bg-emerald-50/50 border-emerald-200/60'
                    : 'bg-card border-border shadow-soft'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h5 className="text-sm font-black">{inst.installmentName}</h5>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
                      <Calendar size={11} />
                      Due: {new Date(inst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {countdown && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                          countdown.type === 'future' && 'bg-blue-50 text-blue-600',
                          countdown.type === 'today' && 'bg-amber-50 text-amber-600',
                          countdown.type === 'overdue' && 'bg-red-50 text-red-600'
                        )}
                      >
                        {countdown.type === 'overdue' ? <AlertTriangle size={10} /> : <Clock size={10} />}
                        {countdown.label}
                      </span>
                    )}
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        inst.status === 'paid' && 'bg-emerald-100 text-emerald-700',
                        inst.status === 'partial' && 'bg-blue-100 text-blue-700',
                        inst.status === 'pending' && 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {inst.status === 'paid' && '✅ '}{inst.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Amount</p>
                    <p className="font-black">{formatINR(inst.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Paid</p>
                    <p className="font-black text-emerald-600">{formatINR(inst.amountPaid)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Pending</p>
                    <p className="font-black text-amber-600">{formatINR(inst.amountPending)}</p>
                  </div>
                </div>

                {/* Paid info */}
                {isPaid && inst.lastPaymentDate && (
                  <div className="bg-emerald-100/50 rounded-xl p-2.5 text-xs text-emerald-700 font-medium flex items-center gap-1.5" suppressHydrationWarning>
                    <Check size={12} />
                    Paid on {new Date(inst.lastPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {inst.lastPaymentMode && ` via ${PAYMENT_MODE_LABELS[inst.lastPaymentMode]}`}
                  </div>
                )}

                {/* Record Payment Button */}
                {inst.status !== 'paid' && (
                  <button
                    type="button"
                    onClick={() => setPayingInstallment(inst)}
                    className="mt-3 w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <IndianRupee size={14} /> Record Payment
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Record Payment Modal */}
      {payingInstallment && (
        <RecordPaymentModal
          installment={payingInstallment}
          onClose={() => setPayingInstallment(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Student Fee"
        message="Are you sure you want to delete this student's fee assignment? This will remove all associated fee records for this student and cannot be undone."
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        type="danger"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main: Admin Student Fee Overview
// ─────────────────────────────────────────────────────────────────
export default function AdminStudentFeeOverview() {
  const [selectedAssignment, setSelectedAssignment] = useState<StudentFeeAssignment | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFeeId, setSelectedFeeId] = useState<string>('all');

  const { data: selectedBranch } = useQuery({
    queryKey: ['selectedBranch'],
    queryFn: () => {
      const saved = localStorage.getItem('selectedBranch');
      return saved ? JSON.parse(saved) : null;
    },
    initialData: null,
  });

  const branchId = selectedBranch?.id ?? '';
  const { data: feeStructures = [] } = useFeeStructures(branchId);
  const { data: allAssignments = [], isLoading } = useBranchFeeAssignments(branchId);

  const filteredAssignments = useMemo(() => {
    let list = allAssignments;

    if (selectedFeeId !== 'all') {
      list = list.filter((a) => a.feeStructureId === selectedFeeId);
    }
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.studentName.toLowerCase().includes(q));
    }

    return list;
  }, [allAssignments, selectedFeeId, statusFilter, search]);

  // Show student detail
  if (selectedAssignment) {
    return (
      <StudentFeeDetail
        assignment={selectedAssignment}
        onBack={() => setSelectedAssignment(null)}
      />
    );
  }

  // Aggregate stats
  const totalCollected = allAssignments.reduce((s, a) => s + a.totalPaid, 0);
  const totalPending = allAssignments.reduce((s, a) => s + a.totalPending, 0);
  const paidCount = allAssignments.filter((a) => a.status === 'paid').length;
  const partialCount = allAssignments.filter((a) => a.status === 'partial').length;

  return (
    <div className="space-y-5 animate-in fade-in duration-400">
      {/* Stats Overview */}
      {allAssignments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-2xl border border-border shadow-soft p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Collected</p>
            <p className="text-lg font-black text-emerald-600">{formatINR(totalCollected)}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-soft p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Pending</p>
            <p className="text-lg font-black text-amber-600">{formatINR(totalPending)}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-soft p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Fully Paid</p>
            <p className="text-lg font-black text-foreground">{paidCount}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-soft p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Partial / Pending</p>
            <p className="text-lg font-black text-foreground">{partialCount} / {allAssignments.length - paidCount - partialCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <Select
            value={selectedFeeId}
            onValueChange={setSelectedFeeId}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Fee Structures" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fee Structures</SelectItem>
              {feeStructures.map((fs) => (
                <SelectItem key={fs.id} value={fs.id}>{fs.feeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
          <Filter size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No matching records found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssignments.map((assignment) => {
            const pct =
              assignment.totalAmount > 0
                ? Math.round((assignment.totalPaid / assignment.totalAmount) * 100)
                : 0;

            return (
              <button
                type="button"
                key={assignment.id}
                onClick={() => setSelectedAssignment(assignment)}
                className="w-full text-left bg-card rounded-xl border border-border shadow-soft p-4 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                      {assignment.studentName}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Total: {formatINR(assignment.totalAmount)}</span>
                      <span className="text-emerald-600 font-bold">Paid: {formatINR(assignment.totalPaid)}</span>
                      {assignment.totalPending > 0 && (
                        <span className="text-amber-600 font-bold">Due: {formatINR(assignment.totalPending)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Mini progress */}
                    <div className="hidden sm:block w-20">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-primary' : 'bg-amber-400'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground text-center mt-0.5">{pct}%</p>
                    </div>

                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        assignment.status === 'paid' && 'bg-emerald-100 text-emerald-700',
                        assignment.status === 'partial' && 'bg-blue-100 text-blue-700',
                        assignment.status === 'pending' && 'bg-amber-100 text-amber-700',
                        assignment.status === 'overdue' && 'bg-red-100 text-red-700'
                      )}
                    >
                      {assignment.status}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
