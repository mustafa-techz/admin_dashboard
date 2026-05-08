import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import type { CountdownInfo, FeeInstallmentFormData } from '@/types/fees';

/**
 * Calculate countdown info for a given due date.
 * Lightweight — no intervals, computed on render.
 */
export function getCountdownInfo(dueDateStr: string): CountdownInfo {
  const today = startOfDay(new Date());
  const dueDate = startOfDay(parseISO(dueDateStr));
  const diff = differenceInDays(dueDate, today);

  if (diff > 0) {
    return {
      label: `⏳ Due in ${diff} day${diff > 1 ? 's' : ''}`,
      days: diff,
      type: 'future',
    };
  }
  if (diff === 0) {
    return {
      label: '⏳ Due Today',
      days: 0,
      type: 'today',
    };
  }
  const overdueDays = Math.abs(diff);
  return {
    label: `⚠ Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
    days: overdueDays,
    type: 'overdue',
  };
}

/**
 * Auto-split a total amount into N equal installments.
 * Last installment absorbs rounding difference.
 */
export function autoSplitInstallments(
  totalAmount: number,
  count: number,
  baseName = 'Installment'
): FeeInstallmentFormData[] {
  if (count <= 0) return [];

  const perInstallment = Math.floor(totalAmount / count);
  const remainder = totalAmount - perInstallment * count;

  return Array.from({ length: count }, (_, i) => ({
    installmentName: `${baseName} ${i + 1}`,
    amount: i === count - 1 ? perInstallment + remainder : perInstallment,
    dueDate: '',
  }));
}

/**
 * Format number as Indian currency.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Validate installments: total must equal the fee amount.
 */
export function validateInstallmentTotal(
  installments: FeeInstallmentFormData[],
  totalFeeAmount: number
): { valid: boolean; entered: number; remaining: number } {
  const entered = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
  const remaining = totalFeeAmount - entered;
  return {
    valid: remaining === 0 && entered > 0,
    entered,
    remaining,
  };
}

/**
 * Generate academic year options (current year ± 2 years).
 */
export function getAcademicYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let y = currentYear - 1; y <= currentYear + 3; y++) {
    years.push(`${y}-${y + 1}`);
  }
  return years;
}
