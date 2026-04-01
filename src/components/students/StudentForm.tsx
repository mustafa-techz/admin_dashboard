import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useQuery } from '@tanstack/react-query';
import { Student } from '@/types/student';
import { ClassMaster, SectionMaster, BranchMaster } from '@/types/masterData';
import { classService, sectionService, branchService } from '@/services/firebase/masterDataService';

interface StudentFormProps {
  initialData?: Partial<Student>;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const validationSchema = Yup.object().shape({
  fullName: Yup.string().required('Full Name is required'),
  classId: Yup.string().required('Class is required'),
  sectionId: Yup.string().required('Section is required'),
  parentDetails: Yup.object().shape({
    fatherName: Yup.string().required('Father Name is required'),
    motherName: Yup.string(),
    phone: Yup.string()
      .matches(/^[0-9]+$/, 'Phone must be a valid number')
      .min(10, 'Must be at least 10 digits')
      .required('Phone is required'),
  }),
  addressDetails: Yup.object().shape({
    street: Yup.string().required('Street Address is required'),
    city: Yup.string().required('City is required'),
    state: Yup.string().required('State is required'),
    pincode: Yup.string()
      .matches(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits')
      .required('Pincode is required'),
  }),
  dateOfBirth: Yup.date().required('Date of Birth is required'),
  bloodGroup: Yup.string().required('Blood Group is required'),
  gender: Yup.string().required('Gender is required'),
});

const defaultValues = {
  rollNumber: '', // Auto-generated on backend
  fullName: '',
  classId: '',
  sectionId: '',
  parentId: 'parent-1',
  parentDetails: {
    fatherName: '',
    motherName: '',
    phone: '',
  },
  addressDetails: {
    street: '',
    city: '',
    state: '',
    pincode: '',
  },
  dateOfBirth: '',
  admissionDate: new Date().toISOString().split('T')[0],
  branchId: '',
  bloodGroup: '',
  gender: '',
};

export default function StudentForm({ initialData, onSubmit, onCancel, isLoading }: StudentFormProps) {
  const isEditing = !!initialData;

  // Master Data Queries
  const { data: classes = [] } = useQuery<ClassMaster[]>({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: sections = [] } = useQuery<SectionMaster[]>({
    queryKey: ['sections'],
    queryFn: () => sectionService.getSections(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: selectedBranch } = useQuery<BranchMaster | null>({
    queryKey: ['selectedBranch'],
    enabled: false, // We only need the cached value
  });

  const handleSubmit = (values: typeof defaultValues) => {
    const finalValues = {
      ...values,
      branchId: isEditing ? values.branchId : (selectedBranch?.id || values.branchId)
    };
    onSubmit(finalValues);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto pt-20 pb-20">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-black tracking-tight">{isEditing ? 'Edit Student' : 'New Admission'}</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Please fill in the student details explicitly below.</p>
        </div>

        <Formik
          initialValues={(initialData as any) || defaultValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isValid, values }) => (
            <Form className="p-6 space-y-8">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Full Name *</label>
                    <Field
                      name="fullName"
                      placeholder="Full Name"
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <ErrorMessage name="fullName" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Roll Number</label>
                    <input
                      disabled
                      value={isEditing ? values.rollNumber : 'Auto-generated'}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm italic text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Date of Birth *</label>
                    <Field
                      name="dateOfBirth"
                      type="date"
                      placeholder="Date of Birth"
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <ErrorMessage name="dateOfBirth" component="div" className="text-red-500 text-xs mt-1 font-bold" />
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
                  <div>
                    <label className="block text-sm font-bold mb-1">Blood Group *</label>
                    <Field as="select" name="bloodGroup" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </Field>
                    <ErrorMessage name="bloodGroup" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                </div>
              </div>

              {/* Academic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Class *</label>
                    <Field as="select" name="classId" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>Class {cls.className}</option>
                      ))}
                    </Field>
                    <ErrorMessage name="classId" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Section *</label>
                    <Field as="select" name="sectionId" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select Section</option>
                      {sections.map(sec => (
                        <option key={sec.id} value={sec.id}>Section {sec.sectionName}</option>
                      ))}
                    </Field>
                    <ErrorMessage name="sectionId" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Admission Date</label>
                    <Field type="date" name="admissionDate" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </div>

              {/* Parent Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Parent / Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Father's Name *</label>
                    <Field name="parentDetails.fatherName" placeholder="Father's Name" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="parentDetails.fatherName" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Mother's Name</label>
                    <Field name="parentDetails.motherName" placeholder="Mother's Name" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Contact Phone *</label>
                    <Field name="parentDetails.phone" placeholder="Contact Phone" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="parentDetails.phone" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                </div>
              </div>

              {/* Address Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-bold mb-1">Street Address *</label>
                    <Field name="addressDetails.street" placeholder="Street Address" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="addressDetails.street" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">City *</label>
                    <Field name="addressDetails.city" placeholder="City" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="addressDetails.city" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">State *</label>
                    <Field name="addressDetails.state" placeholder="State" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="addressDetails.state" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Pincode *</label>
                    <Field name="addressDetails.pincode" placeholder="Pincode" className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <ErrorMessage name="addressDetails.pincode" component="div" className="text-red-500 text-xs mt-1 font-bold" />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!isValid && Object.keys(touched).length > 0)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                >
                  {isLoading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isEditing ? 'Update Student' : 'Enroll Student'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
