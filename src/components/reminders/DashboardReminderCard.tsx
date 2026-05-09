import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, Clock, Info } from 'lucide-react';
import { Reminder } from '@/types/reminder';
import { format, differenceInDays, isToday, isTomorrow } from 'date-fns';
interface DashboardReminderCardProps {
  reminder: Reminder;
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void; // E.g., clicking to pay fee
}

export const DashboardReminderCard: React.FC<DashboardReminderCardProps> = ({
  reminder,
  onDismiss,
  onResolve,
}) => {
  const getPriorityStyles = () => {
    switch (reminder.priority) {
      case 'URGENT':
        return {
          wrapper: 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/50 hover:shadow-red-500/10',
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          title: 'text-red-700 dark:text-red-400',
        };
      case 'HIGH':
      case 'MEDIUM': // Treating Medium/High as Warning for Fees (5 days)
        return {
          wrapper: 'border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/50 hover:shadow-amber-500/10',
          icon: <Bell className="w-5 h-5 text-amber-500" />,
          title: 'text-amber-700 dark:text-amber-400',
        };
      case 'LOW':
      default:
        return {
          wrapper: 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/50 hover:shadow-blue-500/10',
          icon: <Info className="w-5 h-5 text-blue-500" />,
          title: 'text-blue-700 dark:text-blue-400',
        };
    }
  };

  const styles = getPriorityStyles();

  const scheduledDate = typeof reminder.scheduledAt === 'number'
    ? new Date(reminder.scheduledAt)
    : reminder.scheduledAt as Date;

  // Dynamic title calculation for FEE reminders
  let displayTitle = reminder.title;
  let isFeeWarning = false;

  if (reminder.type === 'FEE' && reminder.metadata?.dueDate) {
    isFeeWarning = true;
    const due = new Date(reminder.metadata.dueDate);
    const today = new Date();
    // Normalize to midnight for accurate day difference
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isToday(due)) {
      displayTitle = '⚠ Fee Due Today';
    } else if (isTomorrow(due)) {
      displayTitle = '⚠ Fee Due Tomorrow';
    } else {
      const days = differenceInDays(due, today);
      if (days < 0) {
        displayTitle = `⚠ Fee Overdue by ${Math.abs(days)} Days`;
      } else {
        displayTitle = `⚠ Fee Due in ${days} Days`;
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`w-full rounded-xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${styles.wrapper}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0 bg-background rounded-full p-1.5 shadow-sm">
            {styles.icon}
          </div>
          <div>
            <h4 className={`font-semibold text-sm mb-1 ${isFeeWarning ? 'text-red-500' : styles.title}`}>
              {displayTitle}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {reminder.message}
            </p>

            <div className="mt-3 flex items-center gap-4 text-xs font-medium text-muted-foreground">
              {reminder.metadata?.amount && (
                <span className="bg-background px-2 py-1 rounded-md border border-border/50">
                  Pending: ₹{reminder.metadata.amount.toLocaleString('en-IN')}
                </span>
              )}
              {reminder.type === 'FEE' && reminder.metadata?.dueDate ? (
                <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-border/50">
                  <Clock size={12} className="text-muted-foreground" />
                  <span>Due: {format(new Date(reminder.metadata.dueDate), 'dd MMM yyyy')}</span>
                </div>
              ) : scheduledDate && (
                <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-border/50">
                  <Clock size={12} className="text-muted-foreground" />
                  <span>{format(scheduledDate, 'dd MMM yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {onResolve && reminder.type === 'FEE' && (
            <button
              onClick={() => onResolve(reminder.id)}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
            >
              Pay Now
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(reminder.id)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
