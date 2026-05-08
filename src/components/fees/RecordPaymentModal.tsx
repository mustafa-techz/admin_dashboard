'use client';

import { useState } from 'react';
import { useRecordPayment } from '@/hooks/useFees';
import { formatINR } from '@/lib/feeUtils';
import { cn } from '@/lib/utils';
import type { StudentFeeInstallment, PaymentMode } from '@/types/fees';
import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from '@/types/fees';
import { X, Loader2, IndianRupee, CreditCard, Banknote, Smartphone, Building2, Globe, FileCheck2 } from 'lucide-react';

const PAYMENT_MODE_ICONS: Record<PaymentMode, React.ReactNode> = {
  cash: <Banknote size={16} />,
  upi: <Smartphone size={16} />,
  cheque: <FileCheck2 size={16} />,
  bank_transfer: <Building2 size={16} />,
  card: <CreditCard size={16} />,
  online: <Globe size={16} />,
};

interface RecordPaymentModalProps {
  installment: StudentFeeInstallment;
  onClose: () => void;
}

export default function RecordPaymentModal({ installment, onClose }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<number>(installment.amountPending);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const recordPayment = useRecordPayment();

  const maxAmount = installment.amountPending;
  const isValidAmount = amount > 0 && amount <= maxAmount;

  const handleSubmit = async () => {
    if (!isValidAmount) return;

    await recordPayment.mutateAsync({
      studentId: installment.studentId,
      feeStructureId: installment.feeStructureId,
      feeInstallmentId: installment.feeInstallmentId,
      studentFeeInstallmentId: installment.id,
      amount,
      paymentMode,
      transactionId: transactionId || undefined,
      notes: notes || undefined,
      branchId: installment.branchId,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-foreground flex items-center gap-2">
              <IndianRupee className="text-primary" size={20} />
              Record Payment
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {installment.installmentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Payment Summary */}
          <div className="bg-card rounded-xl border border-border p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-sm font-black">{formatINR(installment.amount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paid</p>
              <p className="text-sm font-black text-emerald-600">{formatINR(installment.amountPaid)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Due</p>
              <p className="text-sm font-black text-amber-600">{formatINR(installment.amountPending)}</p>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Payment Amount (₹)
            </label>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              max={maxAmount}
              min={1}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all',
                isValidAmount
                  ? 'border-border focus:ring-primary/30 focus:border-primary'
                  : 'border-red-300 focus:ring-red-200 text-red-600'
              )}
            />
            {amount > maxAmount && (
              <p className="text-xs text-red-500 mt-1">Amount exceeds pending balance</p>
            )}
            {amount > 0 && amount < maxAmount && (
              <p className="text-xs text-muted-foreground mt-1">
                This will be a partial payment. Remaining: {formatINR(maxAmount - amount)}
              </p>
            )}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all',
                    paymentMode === mode
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {PAYMENT_MODE_ICONS[mode]}
                  {PAYMENT_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Transaction ID <span className="opacity-50">(Optional)</span>
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. TXN123456"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Notes <span className="opacity-50">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this payment..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValidAmount || recordPayment.isPending}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-[0.98]',
              isValidAmount
                ? 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
            )}
          >
            {recordPayment.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Processing...
              </span>
            ) : (
              `Record ${formatINR(amount)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
