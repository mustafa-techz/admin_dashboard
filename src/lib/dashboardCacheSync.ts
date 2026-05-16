import { QueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import type { AttendanceSession, AttendanceStatus } from '@/types/attendance';
import type { ActivityAction, ActivityLog } from '@/types/activity';
import type { DashboardStats } from '@/types';
import type { CreateEventData, SchoolEvent } from '@/types/announcement';
import type { RecordPaymentData, StudentFeeAssignment, StudentFeeInstallment, Payment } from '@/types/fees';

type ActivityLogPage = {
  activities: ActivityLog[];
  lastDoc: unknown;
};

type ActivityInput = {
  action: ActivityAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  branchId?: string | null;
};

type AnnouncementPage = {
  events: SchoolEvent[];
  lastDoc: unknown;
};

type AnnouncementCacheFilter = {
  branchId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  limit?: number;
};

const getCurrentBranchId = (override?: string | null) => {
  if (override) return override;
  const { selectedBranch, selectedBranchId } = useBranchStore.getState();
  const user = useAuthStore.getState().user;
  return selectedBranch?.id || selectedBranchId || user?.branchId || user?.branchIds?.[0] || 'system';
};

const getCurrentActor = () => {
  const user = useAuthStore.getState().user;
  if (!user || user.role === 'parent') return null;

  return {
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
  };
};

export function prependActivityCache(
  queryClient: QueryClient,
  input: ActivityInput
) {
  const actor = getCurrentActor();
  if (!actor) return;

  const branchId = getCurrentBranchId(input.branchId);
  const now = Date.now();
  const activity: ActivityLog = {
    id: `local-${input.entityType}-${input.entityId}-${now}`,
    ...actor,
    branchId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdAt: now,
    expiresAt: now + 90 * 24 * 60 * 60 * 1000,
  };

  const prepend = (old?: ActivityLogPage) => {
    if (!old) return old;
    const activities = [
      activity,
      ...(old.activities ?? []).filter((item) => item.id !== activity.id),
    ].slice(0, old.activities?.length || 20);

    return { ...old, activities };
  };

  queryClient.setQueryData<ActivityLogPage>(queryKeys.activityLogs.byBranch(branchId), prepend);
  queryClient.setQueryData<ActivityLogPage>(queryKeys.activityLogs.byBranch(undefined), prepend);
  queryClient.setQueryData<ActivityLogPage>(queryKeys.activityLogs.full, prepend);
}

export function syncAttendanceDashboardCache(
  queryClient: QueryClient,
  params: {
    date: string;
    classId: string;
    sectionId: string;
    teacherId: string;
    totalStudents: number;
    newStatuses: Record<string, AttendanceStatus>;
    prevStatuses: Record<string, AttendanceStatus>;
    className?: string;
    sectionName?: string;
    branchId?: string | null;
  }
) {
  const session: AttendanceSession = {
    date: params.date,
    classId: params.classId,
    section: params.sectionId,
    teacherId: params.teacherId,
    totalStudents: params.totalStudents,
    createdAt: Timestamp.now(),
    students: { ...params.prevStatuses, ...params.newStatuses },
  };

  queryClient.setQueryData<Record<string, AttendanceStatus>>(
    ['attendance_session', params.classId, params.sectionId, params.date],
    session.students
  );

  queryClient.setQueryData<AttendanceSession[]>(
    queryKeys.dashboard.dailyAttendanceSessions(params.date),
    (old = []) => {
      const withoutCurrent = old.filter(
        (item) => !(item.classId === params.classId && item.section === params.sectionId)
      );
      return [session, ...withoutCurrent];
    }
  );

  if (Object.keys(params.prevStatuses).length === 0) {
    queryClient
      .getQueryCache()
      .findAll({ queryKey: ['teacher-submitted-attendance'] })
      .forEach((query) => {
        const [, classIds, date] = query.queryKey;
        if (
          date === params.date &&
          Array.isArray(classIds) &&
          classIds.includes(params.classId)
        ) {
          queryClient.setQueryData<number>(query.queryKey, (old) =>
            typeof old === 'number' ? old + 1 : old
          );
        }
      });
  }

  const presentCount = Object.values(session.students).filter((status) => status === 'present').length;
  queryClient.setQueryData<DashboardStats>(queryKeys.dashboard.stats, (old) => {
    if (!old) return old;
    return {
      ...old,
      attendanceToday: {
        ...old.attendanceToday,
        present: presentCount,
        total: Math.max(old.attendanceToday?.total ?? 0, params.totalStudents),
      },
    };
  });

  prependActivityCache(queryClient, {
    action: Object.keys(params.prevStatuses).length === 0 ? 'attendance_submitted' : 'attendance_updated',
    entityType: 'attendance_session',
    entityId: `${params.date}_${params.classId}_${params.sectionId}`,
    branchId: params.branchId,
    metadata: {
      className: params.className || params.classId,
      sectionName: params.sectionName || params.sectionId,
      date: params.date,
    },
  });
}

export function syncCreatedEventCache(
  queryClient: QueryClient,
  eventId: string,
  data: CreateEventData,
  createdBy: string,
  createdByName: string
) {
  const now = Timestamp.now();
  const event: SchoolEvent = {
    ...data,
    id: eventId,
    createdBy,
    createdByName,
    createdAt: now,
    updatedAt: now,
  };
  const branchKey = event.branchId || 'all';

  queryClient.setQueryData<SchoolEvent[]>(
    queryKeys.announcements.adminList(branchKey),
    (old = []) => [event, ...old.filter((item) => item.id !== event.id)].slice(0, 50)
  );

  prependActivityCache(queryClient, {
    action: 'event_created',
    entityType: 'event',
    entityId: eventId,
    branchId: event.branchId,
    metadata: { title: event.title },
  });
}

export function syncPublishedEventCache(queryClient: QueryClient, eventId: string) {
  let publishedEvent: SchoolEvent | undefined;

  const updateList = (events: SchoolEvent[]) => {
    return events.map((event) => {
      if (event.id !== eventId) return event;
      publishedEvent = {
        ...event,
        status: 'published',
        publishedToParents: true,
        updatedAt: Timestamp.now(),
      };
      return publishedEvent;
    });
  };

  queryClient.setQueriesData(
    { queryKey: queryKeys.announcements.all },
    (old: unknown) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return updateList(old);
      }
      if (typeof old === 'object' && old !== null && 'events' in old && Array.isArray((old as any).events)) {
        return {
          ...old,
          events: updateList((old as any).events),
        };
      }
      return old;
    }
  );

  if (!publishedEvent || publishedEvent.endAt.toMillis() < Date.now()) return;

  const branchKey = publishedEvent.branchId || 'all';
  queryClient.setQueriesData<SchoolEvent[]>(
    { queryKey: queryKeys.announcements.upcoming(3, branchKey) },
    (old = []) => [publishedEvent!, ...old.filter((event) => event.id !== eventId)]
      .filter((event) => event.publishedToParents && !event.isDeleted && event.endAt.toMillis() >= Date.now())
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis())
      .slice(0, 3)
  );

  prependActivityCache(queryClient, {
    action: 'event_published',
    entityType: 'event',
    entityId: eventId,
    branchId: publishedEvent.branchId,
    metadata: { title: publishedEvent.title },
  });
}

export function syncPublishedEventsRealtimeCache(
  queryClient: QueryClient,
  events: SchoolEvent[],
  branchId?: string
) {
  const now = Date.now();
  const activeEvents = events
    .filter((event) =>
      event.publishedToParents &&
      !event.isDeleted &&
      event.endAt.toMillis() >= now
    )
    .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());

  const newestFirst = [...activeEvents].sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
  );

  queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.announcements.all })
    .forEach((query) => {
      const [, type, limitOrBranch] = query.queryKey;

      if (type === 'upcoming') {
        const limitCount = typeof limitOrBranch === 'number' ? limitOrBranch : 3;
        const targetBranch = query.queryKey[3] as string | undefined;
        
        const scopedEvents = activeEvents.filter((event) => {
          if (targetBranch && targetBranch !== 'all' && event.branchId && event.branchId !== targetBranch) return false;
          return true;
        });

        queryClient.setQueryData(query.queryKey, scopedEvents.slice(0, limitCount));
        return;
      }

      if (type === 'admin') {
        const targetBranch = limitOrBranch as string | undefined;
        const scopedEvents = newestFirst.filter((event) => {
          if (targetBranch && targetBranch !== 'all' && event.branchId && event.branchId !== targetBranch) return false;
          return true;
        });

        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!old || !Array.isArray(old)) return scopedEvents;
          const merged = [
            ...scopedEvents,
            ...old.filter((event) => !scopedEvents.some((next) => next.id === event.id)),
          ];
          return merged.filter((e) => !e.isDeleted).slice(0, Math.max(old.length, scopedEvents.length, 10));
        });
        return;
      }

      const filter = type;
      if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return;

      const scopedFilter = filter as AnnouncementCacheFilter;
      const scopedEvents = activeEvents.filter((event) => {
        if (scopedFilter.branchId && event.branchId !== scopedFilter.branchId) return false;
        if (scopedFilter.sectionId && event.sectionId !== scopedFilter.sectionId) return false;
        if (!scopedFilter.sectionId && scopedFilter.classId && event.classId !== scopedFilter.classId) return false;
        return true;
      });

      if (scopedEvents.length === 0) return;

      queryClient.setQueryData<AnnouncementPage>(query.queryKey, (old) => {
        if (!old || !Array.isArray(old.events)) return old;
        const limitCount = scopedFilter.limit ?? Math.max(old.events.length, scopedEvents.length, 15);
  
        return {
          ...old,
          events: [
            ...scopedEvents,
            ...old.events.filter((event) => !scopedEvents.some((next) => next.id === event.id)),
          ].filter((e) => !e.isDeleted).slice(0, limitCount),
        };
      });
    });
}

export function syncFeePaymentCache(queryClient: QueryClient, paymentId: string, payment: RecordPaymentData) {
  const updateAssignment = (assignment: StudentFeeAssignment) => {
    if (assignment.studentId !== payment.studentId || assignment.feeStructureId !== payment.feeStructureId) {
      return assignment;
    }

    const totalPaid = assignment.totalPaid + payment.amount;
    const totalPending = Math.max(0, assignment.totalAmount - totalPaid);

    return {
      ...assignment,
      totalPaid,
      totalPending,
      status: totalPending <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
      updatedAt: new Date().toISOString(),
    } satisfies StudentFeeAssignment;
  };

  queryClient.setQueriesData<StudentFeeAssignment[]>(
    { queryKey: ['fees', 'branchAssignments', payment.branchId] },
    (old) => old?.map(updateAssignment)
  );
  queryClient.setQueryData<StudentFeeAssignment[]>(
    ['fees', 'studentAssignments', payment.studentId],
    (old) => old?.map(updateAssignment)
  );

  const updateInstallment = (installment: StudentFeeInstallment) => {
    if (installment.id !== payment.studentFeeInstallmentId) return installment;

    const amountPaid = installment.amountPaid + payment.amount;
    const amountPending = Math.max(0, installment.amount - amountPaid);

    return {
      ...installment,
      amountPaid,
      amountPending,
      status: amountPending <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
      lastPaymentDate: new Date().toISOString(),
      lastPaymentMode: payment.paymentMode,
    } satisfies StudentFeeInstallment;
  };

  queryClient.setQueryData<StudentFeeInstallment[]>(
    ['fees', 'studentInstallments', payment.studentId, payment.feeStructureId],
    (old) => old?.map(updateInstallment)
  );
  queryClient.setQueryData<StudentFeeInstallment[]>(
    ['fees', 'pendingInstallments', payment.studentId],
    (old) => old?.map(updateInstallment).filter((item) => item.status === 'pending' || item.status === 'partial')
  );

  const paymentRecord: Payment = {
    ...payment,
    id: paymentId,
    recordedBy: getCurrentActor()?.actorId ?? '',
    createdAt: new Date().toISOString(),
  };
  queryClient.setQueryData<Payment[]>(
    ['fees', 'payments', payment.studentFeeInstallmentId],
    (old = []) => [paymentRecord, ...old]
  );

  prependActivityCache(queryClient, {
    action: 'fee_collected',
    entityType: 'payment',
    entityId: paymentId,
    branchId: payment.branchId,
    metadata: { studentId: payment.studentId, amount: payment.amount },
  });
}
