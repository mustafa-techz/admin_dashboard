import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Reminder } from '@/types/reminder';
import { differenceInDays, isToday, isTomorrow } from 'date-fns';

interface ReminderPopupProps {
  reminders: Reminder[];
}

export const ReminderPopup: React.FC<ReminderPopupProps> = ({ reminders }) => {
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Find a reminder that needs a popup and hasn't been shown in this session
    const popupReminders = reminders.filter(r => r.deliveryChannels.includes('POPUP'));

    for (const reminder of popupReminders) {
      const sessionKey = `reminder_popup_${reminder.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        setActiveReminder(reminder);
        sessionStorage.setItem(sessionKey, 'true');
        break; // Only show one at a time
      }
    }
  }, [reminders]);

  useEffect(() => {
    // Auto dismiss after 5 seconds if not hovered
    if (activeReminder && !isHovered) {
      const timer = setTimeout(() => {
        setActiveReminder(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeReminder, isHovered]);

  const handleDismiss = () => {
    setActiveReminder(null);
  };

  let displayTitle = activeReminder?.title || '';
  let isFeeWarning = false;

  if (activeReminder?.type === 'FEE' && activeReminder.metadata?.dueDate) {
    isFeeWarning = true;
    const due = new Date(activeReminder.metadata.dueDate);
    const today = new Date();
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
    <AnimatePresence>
      {activeReminder && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 z-50 md:w-96"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="bg-card border border-amber-500/30 dark:border-amber-500/20 shadow-xl rounded-xl overflow-hidden flex flex-col relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-amber-500">
            <div className="p-4 flex gap-3 items-start">
              <div className="bg-amber-100 dark:bg-amber-950/50 p-2 rounded-full shrink-0 text-amber-600 dark:text-amber-500">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 pr-6">
                <h4 className={`font-semibold text-sm mb-1 ${isFeeWarning ? 'text-red-500' : 'text-foreground'}`}>
                  {displayTitle}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {activeReminder.message}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Dismiss popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress bar indicator for auto-dismiss */}
            {!isHovered && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="h-1 bg-amber-500/20 w-full"
              >
                <div className="h-full bg-amber-500" />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
