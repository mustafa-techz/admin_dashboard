'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/store/branchStore';
import { branchService } from '@/services/firebase/masterDataService';
import { useCreateFeeStructure } from '@/hooks/useFees';
import { autoSplitInstallments, validateInstallmentTotal, formatINR, getAcademicYearOptions } from '@/lib/feeUtils';
import type { FeeInstallmentFormData, SplitType } from '@/types/fees';
import { Check, Plus, Trash2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─────────────────────────────────────────────────────────────────
// Live Calculation Summary (memoized)
// ─────────────────────────────────────────────────────────────────
const LiveSummary = memo(function LiveSummary({
  totalFeeAmount,
  installments,
}: {
  totalFeeAmount: number;
  installments: FeeInstallmentFormData[];
}) {
  const { valid, entered, remaining } = validateInstallmentTotal(installments, totalFeeAmount);

  if (totalFeeAmount <= 0) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-all duration-300',
        valid
          ? 'border-emerald-200 bg-emerald-50/60'
          : remaining < 0
          ? 'border-red-200 bg-red-50/60'
          : 'border-amber-200 bg-amber-50/60'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        {valid ? (
          <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
            <AlertCircle size={14} className="text-white" />
          </div>
        )}
        <span className={cn('text-sm font-bold', valid ? 'text-emerald-700' : 'text-amber-700')}>
          {valid ? 'Balanced ✅' : 'Installments do not match total'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-0.5">Total Fee</p>
          <p className="font-black text-foreground">{formatINR(totalFeeAmount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-0.5">Entered</p>
          <p className={cn('font-black', entered > totalFeeAmount ? 'text-red-600' : 'text-foreground')}>
            {formatINR(entered)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-0.5">Remaining</p>
          <p className={cn('font-black', remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-emerald-600' : 'text-amber-600')}>
            {formatINR(Math.abs(remaining))}
            {remaining < 0 && <span className="text-xs ml-1">(excess)</span>}
          </p>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
export default function FeeCreationForm() {
  const [feeName, setFeeName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [splitType, setSplitType] = useState<SplitType>('auto');
  const [installmentCount, setInstallmentCount] = useState(4);
  const [installments, setInstallments] = useState<FeeInstallmentFormData[]>([]);
  const [success, setSuccess] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
  });

  const { selectedBranchId } = useBranchStore();

  const createFeeStructure = useCreateFeeStructure();
  const academicYears = useMemo(() => getAcademicYearOptions(), []);

  // Auto-split handler
  const handleAutoSplit = useCallback(() => {
    if (totalAmount > 0 && installmentCount > 0) {
      setInstallments(autoSplitInstallments(totalAmount, installmentCount));
    }
  }, [totalAmount, installmentCount]);

  // Custom: add installment
  const addInstallment = useCallback(() => {
    setInstallments((prev) => [
      ...prev,
      { installmentName: `Installment ${prev.length + 1}`, amount: 0, dueDate: '' },
    ]);
  }, []);

  // Custom: remove installment
  const removeInstallment = useCallback((index: number) => {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update installment field
  const updateInstallment = useCallback(
    (index: number, field: keyof FeeInstallmentFormData, value: string | number) => {
      setInstallments((prev) =>
        prev.map((inst, i) => (i === index ? { ...inst, [field]: value } : inst))
      );
    },
    []
  );

  // Validation
  const validation = useMemo(
    () => validateInstallmentTotal(installments, totalAmount),
    [installments, totalAmount]
  );

  const canSubmit =
    feeName.trim() &&
    academicYear &&
    totalAmount > 0 &&
    selectedBranchId &&
    installments.length > 0 &&
    validation.valid &&
    installments.every((inst) => inst.installmentName.trim() && inst.dueDate);

  const handleSubmit = async () => {
    if (!canSubmit || !selectedBranchId) return;

    try {
      await createFeeStructure.mutateAsync({
        data: {
          feeName,
          academicYear,
          totalAmount,
          splitType,
          installmentCount: installments.length,
          branchId: selectedBranchId,
        },
        installments,
      });

      setSuccess(true);
      // Reset form
      setFeeName('');
      setAcademicYear('');
      setTotalAmount(0);
      setInstallments([]);
      setInstallmentCount(4);

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to create fee structure:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="text-primary" size={28} />
          Create Fee Structure
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Set up annual fees with flexible installment plans.
        </p>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Check size={18} className="text-white" />
          </div>
          <p className="text-sm font-bold text-emerald-800">Fee structure created successfully!</p>
        </div>
      )}

      {/* Step 1: Basic Details */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">1</div>
          <h2 className="text-lg font-bold">Basic Fee Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Fee Name
            </label>
            <input
              type="text"
              value={feeName}
              onChange={(e) => setFeeName(e.target.value)}
              placeholder="e.g. Academic Fee 2026"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Academic Year
            </label>
            <Select
              value={academicYear}
              onValueChange={setAcademicYear}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((yr) => (
                  <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Total Fee Amount (₹)
          </label>
          <input
            type="number"
            value={totalAmount || ''}
            onChange={(e) => setTotalAmount(Number(e.target.value))}
            placeholder="e.g. 100000"
            min={0}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {totalAmount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{formatINR(totalAmount)}</p>
          )}
        </div>
      </div>

      {/* Step 2: Split Type */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">2</div>
          <h2 className="text-lg font-bold">Installment Type</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {(['auto', 'custom'] as SplitType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSplitType(type);
                setInstallments([]);
              }}
              className={cn(
                'flex-1 px-5 py-3.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 text-left',
                splitType === type
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30'
              )}
            >
              <p className="font-black">{type === 'auto' ? '⚡ Auto Split' : '✏️ Custom Split'}</p>
              <p className="text-xs font-medium mt-0.5 opacity-70">
                {type === 'auto'
                  ? 'Evenly divide across installments'
                  : 'Manually set each installment'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Installment Builder */}
      {totalAmount > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">3</div>
            <h2 className="text-lg font-bold">
              {splitType === 'auto' ? 'Auto Split Builder' : 'Custom Installments'}
            </h2>
          </div>

          {/* Auto split controls */}
          {splitType === 'auto' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Number of Installments
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(Math.max(1, Math.min(24, Number(e.target.value))))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleAutoSplit}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                Generate Installments
              </button>
            </div>
          )}

          {/* Custom: Add installment button */}
          {splitType === 'custom' && installments.length === 0 && (
            <button
              type="button"
              onClick={addInstallment}
              className="w-full py-4 rounded-xl border-2 border-dashed border-primary/30 text-primary font-bold text-sm hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add First Installment
            </button>
          )}

          {/* Installment Rows */}
          {installments.length > 0 && (
            <div className="space-y-3">
              {installments.map((inst, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-background border border-border/50 animate-in slide-in-from-bottom-2 duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={inst.installmentName}
                      onChange={(e) => updateInstallment(index, 'installmentName', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={inst.amount || ''}
                      onChange={(e) => updateInstallment(index, 'amount', Number(e.target.value))}
                      min={0}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => updateInstallment(index, 'dueDate', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeInstallment(index)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {splitType === 'custom' && (
                <button
                  type="button"
                  onClick={addInstallment}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground font-bold text-sm hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add Installment
                </button>
              )}
            </div>
          )}

          {/* Live Summary */}
          {installments.length > 0 && (
            <LiveSummary totalFeeAmount={totalAmount} installments={installments} />
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canSubmit || createFeeStructure.isPending}
          onClick={handleSubmit}
          className={cn(
            'px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]',
            canSubmit
              ? 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
          )}
        >
          {createFeeStructure.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Creating...
            </span>
          ) : (
            'Create Fee Structure'
          )}
        </button>
      </div>
    </div>
  );
}
