import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useQuery } from '@tanstack/react-query';
import { Teacher, TeacherFormData } from '@/types/teacher';
import { ClassMaster, BranchMaster } from '@/types/masterData';
import { classService } from '@/services/firebase/masterDataService';

interface TeacherFormProps {
  initialData?: Partial<Teacher>;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const validationSchema = Yup.object().shape({
  fullName: Yup.string().required('Full Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  dateOfBirth: Yup.date().required('Date of Birth is required'),
  joiningDate: Yup.date().required('Joining Date is required'),
  gender: Yup.string().required('Gender is required'),
  addressDetails: Yup.object().shape({
    street: Yup.string().required('Street is required'),
    city: Yup.string().required('City is required'),
    state: Yup.string().required('State is required'),
    pincode: Yup.string().matches(/^[0-9]{6}$/, 'Must be 6 digits').required('Pincode is required'),
  }),
  subjects: Yup.array().of(Yup.string()).min(1, 'At least one subject is required'),
  classIds: Yup.array().of(Yup.string()).min(1, 'At least one class is required'),
  classTeacher: Yup.string(),
  status: Yup.string(),
});

const defaultValues: TeacherFormData = {
  fullName: '',
  email: '',
  dateOfBirth: '',
  joiningDate: new Date().toISOString().split('T')[0],
  gender: '',
  addressDetails: {
    street: '',
    city: '',
    state: '',
    pincode: '',
  },
  branchId: '',
  subjects: [],
  classIds: [],
  classTeacher: '',
};

export default function TeacherForm({ initialData, onSubmit, onCancel, isLoading }: TeacherFormProps) {
  const isEditing = !!initialData;

  const { data: classes = [] } = useQuery<ClassMaster[]>({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
  });

  const { data: selectedBranch } = useQuery<BranchMaster | null>({
    queryKey: ['selectedBranch'],
    queryFn: () => {
      const saved = localStorage.getItem('selectedBranch');
      return saved ? JSON.parse(saved) : null;
    },
    enabled: false,
  });

  const handleSubmit = (values: TeacherFormData) => {
    const finalValues = {
      ...values,
      branchId: isEditing ? values.branchId : (selectedBranch?.id || values.branchId)
    };
    onSubmit(finalValues);
  };

  const availableSubjects = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto pt-20 pb-20">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-black tracking-tight">{isEditing ? 'Edit Teacher' : 'Add Teacher'}</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Fill in the faculty details below.</p>
        </div>

        <Formik
          initialValues={(initialData as any) || defaultValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isValid, values, setFieldValue }) => (
            <Form className="p-6 space-y-8">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Full Name *</label>
                    <Field name="fullName" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="fullName" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Email *</label>
                    <Field name="email" type="email" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Date of Birth *</label>
                    <Field name="dateOfBirth" type="date" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="dateOfBirth" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Joining Date *</label>
                    <Field name="joiningDate" type="date" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="joiningDate" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Gender *</label>
                    <Field as="select" name="gender" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Field>
                    <ErrorMessage name="gender" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  {isEditing && (
                    <div>
                      <label className="block text-sm font-bold mb-1">Status *</label>
                      <Field as="select" name="status" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </Field>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Address Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-bold mb-1">Street *</label>
                    <Field name="addressDetails.street" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="addressDetails.street" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">City *</label>
                    <Field name="addressDetails.city" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="addressDetails.city" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">State *</label>
                    <Field name="addressDetails.state" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="addressDetails.state" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Pincode *</label>
                    <Field name="addressDetails.pincode" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="addressDetails.pincode" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                </div>
              </div>

              {/* Teaching Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Teaching Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Subjects (Multi-select) *</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-secondary border border-border rounded-xl min-h-[100px]">
                      {availableSubjects.map(sub => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            const next = values.subjects.includes(sub)
                              ? values.subjects.filter(s => s !== sub)
                              : [...values.subjects, sub];
                            setFieldValue('subjects', next);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${values.subjects.includes(sub)
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                    <ErrorMessage name="subjects" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Classes (Multi-select) *</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-secondary border border-border rounded-xl min-h-[100px]">
                      {classes.map(cls => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => {
                            const next = values.classIds.includes(cls.id)
                              ? values.classIds.filter(id => id !== cls.id)
                              : [...values.classIds, cls.id];
                            setFieldValue('classIds', next);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${values.classIds.includes(cls.id)
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                          Class {cls.className}
                        </button>
                      ))}
                    </div>
                    <ErrorMessage name="classIds" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">Class Teacher Of</label>
                    <Field as="select" name="classTeacher" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">None / Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>Class {cls.className}</option>
                      ))}
                    </Field>
                    <ErrorMessage name="classTeacher" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                >
                  {isLoading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isEditing ? 'Update Teacher' : 'Add Teacher'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
