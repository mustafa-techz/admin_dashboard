'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';
import DataTable from '@/components/tables/DataTable';
import FilterBar from '@/components/tables/FilterBar';
import { Student } from '@/types/student';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StudentForm from '@/components/students/StudentForm';
import StudentViewModal from '@/components/students/StudentViewModal';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useMasterData } from '@/context/MasterDataContext';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { classes, sections } = useMasterData();
  console.log('Classes:', classes, 'in students page');
  console.log('Sections:', sections, 'in students page');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  // Confirmation for Add/Edit
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => studentService.getStudents(),
  });

  const createMutation = useMutation({
    mutationFn: studentService.addStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsFormOpen(false);
      setPendingSubmitData(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => studentService.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsFormOpen(false);
      setEditingStudent(null);
      setPendingSubmitData(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentService.deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setStudentToDelete(null);
      setIsDeleteOpen(false);
    },
  });

  const filteredStudents = students?.filter(student => {
    const matchesSearch =
      student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      student?.rollNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesClass = !classFilter || student.classId === classFilter;

    return matchesSearch && matchesClass;
  }) || [];

  const handleFormSubmit = (data: any) => {
    setPendingSubmitData(data);
    setIsSubmitConfirmOpen(true);
  };

  const confirmSubmit = () => {
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: pendingSubmitData });
    } else {
      createMutation.mutate(pendingSubmitData);
    }
    setIsSubmitConfirmOpen(false);
  };

  const columns = [
    {
      header: 'S.No',
      cell: (student: Student) => {
        const index = filteredStudents.findIndex(s => s.id === student.id);
        return <span className="font-bold text-muted-foreground">{index + 1}</span>;
      }
    },
    {
      header: 'Roll No',
      accessorKey: 'rollNumber' as keyof Student,
    },
    {
      header: 'Student Name',
      cell: (student: Student) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xs">
            {student?.fullName?.charAt(0)}
          </div>
          <span className="font-bold text-foreground tracking-tight">{student?.fullName}</span>
        </div>
      )
    },
    {
      header: 'Father Name',
      cell: (student: Student) => (
        <div className="flex items-center justify-start gap-2">
          <span className="font-bold text-foreground tracking-tight">{student?.parentDetails?.fatherName}</span>
        </div>
      )
    },
    {
      header: 'Class',
      cell: (student: Student) => {
        const className = classes.find(c => c.id === student.classId)?.className || student.classId;
        const sectionName = sections.find(s => s.id === student.sectionId)?.sectionName || student.sectionId;
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground tracking-tight">{className}{sectionName}</span>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      cell: (student: Student) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setViewingStudent(student); setIsViewOpen(true); }}
            className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditingStudent(student); setIsFormOpen(true); }}
            className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setStudentToDelete(student.id); setIsDeleteOpen(true); }}
            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Students</h2>
        <p className="text-muted-foreground mt-1 font-medium">Browse and manage school student records.</p>
      </div>

      <FilterBar
        onSearch={setSearch}
        onFilterChange={setClassFilter}
        onAddClick={() => {
          setEditingStudent(null);
          setIsFormOpen(true);
        }}
        addLabel="New Admission"
        placeholder="Search by name or roll number..."
      />

      <DataTable
        columns={columns}
        data={filteredStudents}
        isLoading={isLoading}
      />

      {/* View Modal */}
      <StudentViewModal
        isOpen={isViewOpen}
        onClose={() => { setIsViewOpen(false); setViewingStudent(null); }}
        student={viewingStudent}
      />

      {/* Form Modal */}
      {isFormOpen && (
        <StudentForm
          initialData={editingStudent || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => { setIsFormOpen(false); setEditingStudent(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Submit Confirmation Modal */}
      <ConfirmationModal
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        onConfirm={confirmSubmit}
        title="Confirm Submission"
        message={`Are you sure you want to ${editingStudent ? 'update' : 'add'} this student?`}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setStudentToDelete(null); }}
        onConfirm={() => {
          if (studentToDelete) deleteMutation.mutate(studentToDelete);
        }}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
