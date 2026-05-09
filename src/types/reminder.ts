export type ReminderType = 'FEE' | 'ATTENDANCE' | 'EXAM' | 'TEACHER';

export type ReminderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type DeliveryChannel = 'DASHBOARD' | 'POPUP' | 'PUSH';

export type ReminderStatus = 'PENDING' | 'SENT' | 'READ' | 'DISMISSED' | 'RESOLVED';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  targetRole: 'STUDENT' | 'PARENT' | 'TEACHER' | 'ADMIN';
  targetUserIds: string[]; // Supports multiple users (e.g., all parents of a student)
  branchId: string;
  priority: ReminderPriority;
  deliveryChannels: DeliveryChannel[]; // What channels this reminder should use
  scheduledAt: number | Date; // When it should trigger (timestamp)
  status: ReminderStatus;
  metadata?: Record<string, any>; // Extra contextual data (e.g., feeAmount, examId)
  createdAt: number | Date;
  updatedAt?: number | Date;
}

// DTO for creating a reminder
export type CreateReminderDTO = Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>;
