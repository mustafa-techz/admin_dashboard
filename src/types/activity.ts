export type ActivityAction = 
  | 'attendance_submitted'
  | 'attendance_updated'
  | 'marks_entered'
  | 'marks_updated'
  | 'exam_published'
  | 'fee_created'
  | 'fee_updated'
  | 'fee_collected'
  | 'timetable_created'
  | 'timetable_updated'
  | 'event_created'
  | 'event_published'
  | 'event_deleted'
  | 'student_created'
  | 'student_updated'
  | 'teacher_created'
  | 'teacher_updated'
  | 'branch_updated'
  | 'broadcast_sent'
  | 'admin_action';

export interface ActivityLog {
  id: string;
  
  actorId: string;
  actorName: string;
  actorRole: string;
  
  branchId: string;
  
  action: ActivityAction;
  
  entityType: string;
  entityId: string;
  
  metadata?: Record<string, unknown>;
  
  createdAt: number;
  expiresAt: number;
}
