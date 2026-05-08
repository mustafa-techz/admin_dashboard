'use client';

import { useMemo } from 'react';
import { useStudentFeeAssignments, useStudentFeeInstallments, useFeeStructureById } from '@/hooks/useFees';
import { getCountdownInfo, formatINR } from '@/lib/feeUtils';
import { cn } from '@/lib/utils';
import type { StudentFeeAssignment, StudentFeeInstallment, CountdownInfo } from '@/types/fees';
import { PAYMENT_MODE_LABELS } from '@/types/fees';
import { IndianRupee, Calendar, Check, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Progress Bar Component
// ─────────────────────────────────────────────────────────────────
function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-muted-foreground">{percentage}% paid</span>
        <span className="font-medium text-muted-foreground">
          {formatINR(paid)} / {formatINR(total)}
        </span>
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
  );
}

// ─────────────────────────────────────────────────────────────────
// Countdown Badge Component
// ─────────────────────────────────────────────────────────────────
function CountdownBadge({ info }: { info: CountdownInfo }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
        info.type === 'future' && 'bg-blue-50 text-blue-600',
        info.type === 'today' && 'bg-amber-50 text-amber-600',
        info.type === 'overdue' && 'bg-red-50 text-red-600 animate-pulse'
      )}
    >
      {info.type === 'future' && <Clock size={12} />}
      {info.type === 'today' && <AlertTriangle size={12} />}
      {info.type === 'overdue' && <AlertTriangle size={12} />}
      {info.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
        status === 'paid' && 'bg-emerald-100 text-emerald-700',
        status === 'partial' && 'bg-blue-100 text-blue-700',
        status === 'pending' && 'bg-amber-100 text-amber-700',
        status === 'overdue' && 'bg-red-100 text-red-700'
      )}
    >
      {status === 'paid' && <Check size={12} />}
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Installment Card
// ─────────────────────────────────────────────────────────────────
function InstallmentCard({ installment }: { installment: StudentFeeInstallment }) {
  const countdown = useMemo(
    () => (installment.status !== 'paid' ? getCountdownInfo(installment.dueDate) : null),
    [installment.dueDate, installment.status]
  );

  const isPaid = installment.status === 'paid';
  const isPartial = installment.status === 'partial';

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-all duration-200',
        isPaid
          ? 'bg-emerald-50/50 border-emerald-200/60'
          : isPartial
          ? 'bg-blue-50/50 border-blue-200/60'
          : 'bg-card border-border shadow-soft hover:shadow-md'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-base font-black text-foreground">{installment.installmentName}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Calendar size={12} />
            <span>Due: {new Date(installment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
        <StatusBadge status={installment.status} />
      </div>

      {/* Amount Info */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Amount</p>
          <p className="text-sm font-black text-foreground">{formatINR(installment.amount)}</p>
        </div>
        {(isPaid || isPartial) && (
          <>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Paid</p>
              <p className="text-sm font-black text-emerald-600">{formatINR(installment.amountPaid)}</p>
            </div>
            {isPartial && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Pending</p>
                <p className="text-sm font-black text-amber-600">{formatINR(installment.amountPending)}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Partial progress bar */}
      {isPartial && (
        <div className="mb-4">
          <ProgressBar paid={installment.amountPaid} total={installment.amount} />
        </div>
      )}

      {/* Paid Info */}
      {isPaid && installment.lastPaymentDate && (
        <div className="bg-emerald-100/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <Check size={14} />
            <span>Paid on {new Date(installment.lastPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          {installment.lastPaymentMode && (
            <span className="text-emerald-600 font-medium">
              via {PAYMENT_MODE_LABELS[installment.lastPaymentMode]}
            </span>
          )}
        </div>
      )}

      {/* Countdown */}
      {countdown && !isPaid && (
        <div className="mt-1">
          <CountdownBadge info={countdown} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Fee Overview Card (per assignment)
// ─────────────────────────────────────────────────────────────────
function FeeOverviewSection({ assignment }: { assignment: StudentFeeAssignment }) {
  const { data: feeStructure } = useFeeStructureById(assignment.feeStructureId);
  const { data: installments = [], isLoading } = useStudentFeeInstallments(
    assignment.studentId,
    assignment.feeStructureId
  );

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <IndianRupee size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">
                {feeStructure?.feeName || 'Academic Fee'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {feeStructure?.academicYear}
              </p>
            </div>
          </div>
          <StatusBadge status={assignment.status} />
        </div>

        {/* Amount Summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-background rounded-xl p-3 text-center border border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total</p>
            <p className="text-lg font-black text-foreground">{formatINR(assignment.totalAmount)}</p>
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
        <ProgressBar paid={assignment.totalPaid} total={assignment.totalAmount} />
      </div>

      {/* Installments */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {installments.map((inst) => (
            <InstallmentCard key={inst.id} installment={inst} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Parent Dashboard
// ─────────────────────────────────────────────────────────────────
export default function ParentFeeDashboard({ studentId }: { studentId: string }) {
  const { data: assignments = [], isLoading } = useStudentFeeAssignments(studentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <TrendingUp size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No Fees Assigned</h3>
        <p className="text-sm text-muted-foreground mt-1">
          There are no fee structures assigned to this student yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {assignments.map((assignment) => (
        <FeeOverviewSection key={assignment.id} assignment={assignment} />
      ))}
    </div>
  );
}
