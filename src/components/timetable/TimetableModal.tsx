import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { TimetableFormData, TimetableEntry } from '../../types/timetable';
import { useMasterData } from '../../hooks/useMasterData';
import { useQuery } from '@tanstack/react-query';
import { BranchMaster } from '../../types/masterData';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TimetableFormData) => Promise<void>;
  initialValues?: TimetableEntry;
  classId?: string;
  sectionId?: string;
  day?: string;
  timeSlotId?: string;
}

const validationSchema = Yup.object().shape({
  subjectId: Yup.string().required('Subject is required'),
  teacherId: Yup.string().required('Teacher is required'),
  classId: Yup.string().required('Class is required'),
  sectionId: Yup.string().required('Section is required'),
  day: Yup.string().required('Day is required'),
  timeSlotId: Yup.string().required('Time Slot is required'),
  branchId: Yup.string().required('Branch is required'),
});

export default function TimetableModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  classId,
  sectionId,
  day,
  timeSlotId
}: TimetableModalProps) {
  const { subjects, teachers, branches, isLoading: isMasterLoading } = useMasterData();

  const { data: selectedBranch } = useQuery<BranchMaster>({
    queryKey: ['selectedBranch'],
    enabled: false,
  });

  if (!isOpen) return null;

  const defaultValues: TimetableFormData = {
    classId: classId || initialValues?.classId || '',
    sectionId: sectionId || initialValues?.sectionId || '',
    day: day || initialValues?.day || '',
    timeSlotId: timeSlotId || initialValues?.timeSlotId || '',
    subjectId: initialValues?.subjectId || '',
    teacherId: initialValues?.teacherId || '',
    branchId: initialValues?.branchId || selectedBranch?.id || branches[0]?.id || '',
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-xl max-h-[90vh] rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border bg-muted/30">
          <h2 className="text-2xl font-black tracking-tight">
            {initialValues ? 'Edit Entry' : 'Schedule Session'}
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {initialValues ? 'Modify an existing timetable slot.' : 'Assign a subject and teacher to a specific time.'}
          </p>
        </div>

        <Formik
          initialValues={defaultValues}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            try {
              await onSubmit(values);
              onClose();
            } catch (error: any) {
              setStatus(error.message || 'Something went wrong');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, status, values }) => (
            <Form className="p-6 overflow-y-auto space-y-6">
              {status && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-xl flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                   {status}
                </div>
              )}

              <div className="space-y-6">
                {/* Academic Context (Only show if not provided via props) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!classId && (
                    <div>
                      <label className="block text-sm font-bold mb-1 uppercase tracking-widest text-muted-foreground/60 text-[10px]">Class *</label>
                      <Field
                        as="select"
                        name="classId"
                        className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium focus:outline-none"
                      >
                        <option value="">Select Class</option>
                        {useMasterData().classes.map(c => <option key={c.id} value={c.classId}>Class {c.className}</option>)}
                      </Field>
                      <ErrorMessage name="classId" component="div" className="text-red-500 text-[10px] mt-1 font-bold" />
                    </div>
                  )}
                  {!sectionId && (
                    <div>
                      <label className="block text-sm font-bold mb-1 uppercase tracking-widest text-muted-foreground/60 text-[10px]">Section *</label>
                      <Field
                        as="select"
                        name="sectionId"
                        className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium focus:outline-none"
                      >
                        <option value="">Select Section</option>
                        {useMasterData().sections.map(s => <option key={s.id} value={s.sectionId}>Section {s.sectionName}</option>)}
                      </Field>
                      <ErrorMessage name="sectionId" component="div" className="text-red-500 text-[10px] mt-1 font-bold" />
                    </div>
                  )}
                </div>

                {/* Day and Time Selection (Only show if not provided via props) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!day && (
                    <div>
                      <label className="block text-sm font-bold mb-1 uppercase tracking-widest text-muted-foreground/60 text-[10px]">Day *</label>
                      <Field
                        as="select"
                        name="day"
                        className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium focus:outline-none"
                      >
                        <option value="">Select Day</option>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </Field>
                      <ErrorMessage name="day" component="div" className="text-red-500 text-[10px] mt-1 font-bold" />
                    </div>
                  )}
                  {!timeSlotId && (
                    <div>
                      <label className="block text-sm font-bold mb-1 uppercase tracking-widest text-muted-foreground/60 text-[10px]">Time Slot *</label>
                      <Field
                        as="select"
                        name="timeSlotId"
                        className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium focus:outline-none"
                      >
                        <option value="">Select Slot</option>
                        {useMasterData().timeSlots.map(ts => <option key={ts.id} value={ts.timeSlotId}>{ts.label}</option>)}
                      </Field>
                      <ErrorMessage name="timeSlotId" component="div" className="text-red-500 text-[10px] mt-1 font-bold" />
                    </div>
                  )}
                </div>

                <div className="h-px bg-border/50" />

                {/* Subject and Teacher Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-primary text-[11px] uppercase tracking-widest">Subject *</label>
                    <Field
                      as="select"
                      name="subjectId"
                      className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.subjectId}>{s.subjectName}</option>
                      ))}
                    </Field>
                    <ErrorMessage name="subjectId" component="div" className="text-red-500 text-[10px] mt-1 font-bold" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1 text-primary text-[11px] uppercase tracking-widest">Teacher *</label>
                    <Field
                      as="select"
                      name="teacherId"
                      className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.teacherId}>{t.fullName}</option>
                      ))}
                    </Field>
                    <ErrorMessage name="teacherId" component="div" className="text-red-500 text-[10px] mt-1 font-bold" />
                  </div>
                </div>

                {/* Hidden Fields for values provided via props */}
                {classId && <Field type="hidden" name="classId" />}
                {sectionId && <Field type="hidden" name="sectionId" />}
                {day && <Field type="hidden" name="day" />}
                {timeSlotId && <Field type="hidden" name="timeSlotId" />}
                <Field type="hidden" name="branchId" />
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-border mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-2.5 rounded-xl text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isMasterLoading}
                  className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 min-w-[140px]"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {initialValues ? 'Update Entry' : 'Create Session'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
