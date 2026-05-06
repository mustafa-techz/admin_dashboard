import { Timestamp } from 'firebase/firestore';

export type EventType = 'academic' | 'exam' | 'meeting' | 'holiday' | 'activity';
export type EventScope = 'school' | 'class' | 'section';
export type EventStatus = 'draft' | 'published' | 'archived';
export type EventPriority = 'normal' | 'high';

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  scope: EventScope;
  classId?: string | null;
  sectionId?: string | null;
  startAt: Timestamp;
  endAt: Timestamp;
  createdBy: string;
  createdByName: string;
  status: EventStatus;
  publishedToParents: boolean;
  isDeleted: boolean;
  priority: EventPriority;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type CreateEventData = Omit<SchoolEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>;

export interface AnnouncementFilter {
  classId?: string | null;
  sectionId?: string | null;
  limit?: number;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  academic: 'Academic',
  exam: 'Exam',
  meeting: 'Meeting',
  holiday: 'Holiday',
  activity: 'Activity',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  academic: 'text-blue-600 bg-blue-50 border-blue-200',
  exam: 'text-red-600 bg-red-50 border-red-200',
  meeting: 'text-purple-600 bg-purple-50 border-purple-200',
  holiday: 'text-green-600 bg-green-50 border-green-200',
  activity: 'text-orange-600 bg-orange-50 border-orange-200',
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  academic: '📚',
  exam: '📝',
  meeting: '🤝',
  holiday: '🎉',
  activity: '⚽',
};
