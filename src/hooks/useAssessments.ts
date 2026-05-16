import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { assessmentService } from '@/services/assessmentService';
import type {
  Assessment,
  AssessmentFormData,
  AssessmentStatus,
  ExamScheduleFormData,
  SubjectMark,
  SubjectMarkEntry,
} from '@/types/assessment';
import { ASSESSMENT_STATUS_ORDER } from '@/types/assessment';
import { prependActivityCache } from '@/lib/dashboardCacheSync';

// ─────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────
export const assessmentKeys = {
  all: ['assessments'] as const,
  list: (branchId: string, status?: AssessmentStatus) =>
    [...assessmentKeys.all, 'list', branchId, status ?? 'all'] as const,
  published: (classId: string, sectionId: string) =>
    [...assessmentKeys.all, 'published', classId, sectionId] as const,
  detail: (id: string) => [...assessmentKeys.all, 'detail', id] as const,
  schedule: (id: string) => [...assessmentKeys.all, 'schedule', id] as const,
  subjectMarks: (id: string, subject: string) =>
    [...assessmentKeys.all, 'subjectMarks', id, subject] as const,
  allMarks: (id: string) => [...assessmentKeys.all, 'allMarks', id] as const,
  summaries: (id: string) => [...assessmentKeys.all, 'summaries', id] as const,
  studentSummary: (id: string, studentId: string) =>
    [...assessmentKeys.all, 'studentSummary', id, studentId] as const,
};

// ─────────────────────────────────────────────────────────────────
// Query Hooks
// ─────────────────────────────────────────────────────────────────
export function useAssessments(branchId: string, status?: AssessmentStatus) {
  return useQuery({
    queryKey: assessmentKeys.list(branchId, status),
    queryFn: () => assessmentService.getAssessments(branchId, status),
    enabled: !!branchId,
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function usePublishedAssessments(classId: string, sectionId: string) {
  return useQuery({
    queryKey: assessmentKeys.published(classId, sectionId),
    queryFn: () => assessmentService.getPublishedAssessments(classId, sectionId),
    enabled: !!classId && !!sectionId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAssessmentById(id: string) {
  return useQuery({
    queryKey: assessmentKeys.detail(id),
    queryFn: () => assessmentService.getAssessmentById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExamSchedule(assessmentId: string) {
  return useQuery({
    queryKey: assessmentKeys.schedule(assessmentId),
    queryFn: () => assessmentService.getSchedule(assessmentId),
    enabled: !!assessmentId,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useSubjectMarks(assessmentId: string, subject: string) {
  return useQuery({
    queryKey: assessmentKeys.subjectMarks(assessmentId, subject),
    queryFn: () => assessmentService.getSubjectMarks(assessmentId, subject),
    enabled: !!assessmentId && !!subject,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllMarks(assessmentId: string) {
  return useQuery({
    queryKey: assessmentKeys.allMarks(assessmentId),
    queryFn: () => assessmentService.getAllMarks(assessmentId),
    enabled: !!assessmentId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllSummaries(assessmentId: string) {
  return useQuery({
    queryKey: assessmentKeys.summaries(assessmentId),
    queryFn: () => assessmentService.getAllSummaries(assessmentId),
    enabled: !!assessmentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentSummary(assessmentId: string, studentId: string) {
  return useQuery({
    queryKey: assessmentKeys.studentSummary(assessmentId, studentId),
    queryFn: () => assessmentService.getStudentSummary(assessmentId, studentId),
    enabled: !!assessmentId && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────
export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      data,
      schedule,
      createdBy,
    }: {
      data: AssessmentFormData;
      schedule: ExamScheduleFormData[];
      createdBy: string;
    }) => assessmentService.createAssessment(data, schedule, createdBy),
    onSuccess: (assessmentId, variables) => {
      const now = new Date().toISOString();
      const assessment: Assessment = {
        id: assessmentId,
        ...variables.data,
        status: 'draft',
        publishedAt: null,
        publishedBy: null,
        createdBy: variables.createdBy,
        createdAt: now,
        updatedAt: now,
      };

      queryClient.setQueryData<Assessment[]>(
        assessmentKeys.list(variables.data.branchId, 'draft'),
        (old = []) => [assessment, ...old.filter((item) => item.id !== assessmentId)]
      );
      queryClient.setQueryData<Assessment[]>(
        assessmentKeys.list(variables.data.branchId),
        (old = []) => [assessment, ...old.filter((item) => item.id !== assessmentId)]
      );
      prependActivityCache(queryClient, {
        action: 'exam_published',
        entityType: 'assessment',
        entityId: assessmentId,
        branchId: variables.data.branchId,
        metadata: {
          assessmentName: variables.data.name,
          classId: variables.data.classId,
        },
      });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all, refetchType: 'none' });
    },
  });
}

export function useSaveSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assessmentId, slots }: { assessmentId: string; slots: ExamScheduleFormData[] }) =>
      assessmentService.saveSchedule(assessmentId, slots),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.schedule(variables.assessmentId) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.assessmentId) });
    },
  });
}

export function useUpdateAssessmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AssessmentStatus }) =>
      assessmentService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      const cachedAssessment = queryClient
        .getQueriesData<Assessment[]>({ queryKey: assessmentKeys.all })
        .flatMap(([, data]) => data ?? [])
        .find((item) => item.id === variables.id);
      const updatedAssessment = cachedAssessment
        ? {
            ...cachedAssessment,
            status: variables.status,
            publishedAt: variables.status === 'published' ? new Date().toISOString() : cachedAssessment.publishedAt,
            updatedAt: new Date().toISOString(),
          }
        : undefined;

      queryClient.setQueriesData<Assessment[]>(
        { queryKey: assessmentKeys.all },
        (old) => old?.map((item) => (
          item.id === variables.id
            ? {
                ...item,
                status: variables.status,
                publishedAt: variables.status === 'published' ? new Date().toISOString() : item.publishedAt,
                updatedAt: new Date().toISOString(),
              }
            : item
        ))
      );
      if (updatedAssessment) {
        ASSESSMENT_STATUS_ORDER
          .filter((status) => status !== variables.status)
          .forEach((status) => {
            queryClient.setQueryData<Assessment[]>(
              assessmentKeys.list(updatedAssessment.branchId, status),
              (old) => old?.filter((item) => item.id !== variables.id)
            );
          });
        queryClient.setQueryData<Assessment[]>(
          assessmentKeys.list(updatedAssessment.branchId, variables.status),
          (old = []) => [updatedAssessment, ...old.filter((item) => item.id !== variables.id)]
        );
      }
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all, refetchType: 'none' });
    },
  });
}

export function useSaveSubjectMarks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assessmentId,
      subject,
      maxMarks,
      entries,
      enteredBy,
      enteredByName,
    }: {
      assessmentId: string;
      subject: string;
      maxMarks: number;
      entries: SubjectMarkEntry[];
      enteredBy: string;
      enteredByName: string;
    }) => assessmentService.saveSubjectMarks(assessmentId, subject, maxMarks, entries, enteredBy, enteredByName),
    onSuccess: (_, variables) => {
      const savedAt = new Date().toISOString();
      const savedMarks: SubjectMark[] = variables.entries.map((entry) => ({
        id: `${entry.studentId}_${variables.subject}`,
        studentId: entry.studentId,
        studentName: entry.studentName,
        subject: variables.subject,
        marks: entry.isAbsent ? 0 : entry.marks,
        maxMarks: variables.maxMarks,
        isAbsent: entry.isAbsent,
        enteredBy: variables.enteredBy,
        enteredByName: variables.enteredByName,
        updatedAt: savedAt,
      }));

      queryClient.setQueryData<SubjectMark[]>(
        assessmentKeys.subjectMarks(variables.assessmentId, variables.subject),
        (old = []) => {
          const savedStudentIds = new Set(savedMarks.map((mark) => mark.studentId));
          return [
            ...savedMarks,
            ...old.filter((mark) => !savedStudentIds.has(mark.studentId)),
          ];
        }
      );
      queryClient.setQueryData<SubjectMark[]>(
        assessmentKeys.allMarks(variables.assessmentId),
        (old) => {
          if (!old) return old;
          const savedIds = new Set(savedMarks.map((mark) => mark.id));
          return [
            ...savedMarks,
            ...old.filter((mark) => !savedIds.has(mark.id)),
          ];
        }
      );
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.subjectMarks(variables.assessmentId, variables.subject),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.allMarks(variables.assessmentId), refetchType: 'none' });
      prependActivityCache(queryClient, {
        action: 'marks_entered',
        entityType: 'assessment',
        entityId: variables.assessmentId,
        metadata: {
          subject: variables.subject,
          assessmentName: 'Assessment',
        },
      });
    },
  });
}

export function useGenerateSummaries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assessmentId: string) => assessmentService.generateSummaries(assessmentId),
    onSuccess: (_, assessmentId) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.summaries(assessmentId), refetchType: 'none' });
    },
  });
}

export function usePublishResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assessmentId, publishedBy }: { assessmentId: string; publishedBy: string }) =>
      assessmentService.publishResults(assessmentId, publishedBy),
    onSuccess: (_, variables) => {
      const cachedAssessment = queryClient
        .getQueriesData<Assessment[]>({ queryKey: assessmentKeys.all })
        .flatMap(([, data]) => data ?? [])
        .find((item) => item.id === variables.assessmentId);
      const publishedAssessment = cachedAssessment
        ? {
            ...cachedAssessment,
            status: 'published' as AssessmentStatus,
            publishedBy: variables.publishedBy,
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : undefined;

      queryClient.setQueriesData<Assessment[]>(
        { queryKey: assessmentKeys.all },
        (old) => old?.map((item) => (
          item.id === variables.assessmentId
            ? {
                ...item,
                status: 'published',
                publishedBy: variables.publishedBy,
                publishedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : item
        ))
      );
      if (publishedAssessment) {
        queryClient.setQueryData<Assessment[]>(
          assessmentKeys.list(publishedAssessment.branchId, 'published'),
          (old = []) => [publishedAssessment, ...old.filter((item) => item.id !== variables.assessmentId)]
        );
      }
      prependActivityCache(queryClient, {
        action: 'exam_published',
        entityType: 'assessment',
        entityId: variables.assessmentId,
      });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all, refetchType: 'none' });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assessmentService.deleteAssessment(id),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<Assessment[]>(
        { queryKey: assessmentKeys.all },
        (old) => old?.filter((item) => item.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all, refetchType: 'none' });
    },
  });
}
