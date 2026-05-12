import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { assessmentService } from '@/services/assessmentService';
import type {
  AssessmentFormData,
  AssessmentStatus,
  ExamScheduleFormData,
  SubjectMarkEntry,
} from '@/types/assessment';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
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
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.subjectMarks(variables.assessmentId, variables.subject),
      });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.allMarks(variables.assessmentId) });
    },
  });
}

export function useGenerateSummaries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assessmentId: string) => assessmentService.generateSummaries(assessmentId),
    onSuccess: (_, assessmentId) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.summaries(assessmentId) });
    },
  });
}

export function usePublishResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assessmentId, publishedBy }: { assessmentId: string; publishedBy: string }) =>
      assessmentService.publishResults(assessmentId, publishedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assessmentService.deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
}
