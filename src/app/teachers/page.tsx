'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService } from '@/services/teacherService';
import { classService } from '@/services/firebase/masterDataService';
import DataTable from '@/components/tables/DataTable';
import FilterBar from '@/components/tables/FilterBar';
import { Teacher } from '@/types/teacher';
import { Eye, Edit, Trash2, UserCheck, BookOpen, BadgeCheck } from 'lucide-react';
import TeacherForm from '@/components/teachers/TeacherForm';
import TeacherViewModal from '@/components/teachers/TeacherViewModal';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

export default function TeachersPage() {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const queryClient = useQueryClient();

  // Master Data Queries
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
    staleTime: 5 * 60 * 1000,
  });

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);

  // Confirmation for Add/Edit
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: () => teacherService.getTeachers(),
  });

  const createMutation = useMutation({
    mutationFn: teacherService.addTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsFormOpen(false);
      setPendingSubmitData(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Teacher> }) => teacherService.updateTeacher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsFormOpen(false);
      setEditingTeacher(null);
      setPendingSubmitData(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teacherService.deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setTeacherToDelete(null);
      setIsDeleteOpen(false);
    },
  });

  const filteredTeachers = teachers?.filter(teacher => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      teacher?.fullName?.toLowerCase().includes(searchLower) ||
      teacher?.empId?.toLowerCase().includes(searchLower) ||
      teacher?.subjects?.some(s => s.toLowerCase().includes(searchLower));

    const matchesClass = !classFilter || 
      teacher.classTeacher === classFilter || 
      teacher.classIds.includes(classFilter);

    return matchesSearch && matchesClass;
  }) || [];

  const handleFormSubmit = (data: any) => {
    setPendingSubmitData(data);
    setIsSubmitConfirmOpen(true);
  };

  const confirmSubmit = () => {
    if (editingTeacher) {
      updateMutation.mutate({ id: editingTeacher.id, data: pendingSubmitData });
    } else {
      createMutation.mutate(pendingSubmitData);
    }
    setIsSubmitConfirmOpen(false);
  };

  const columns = [
    {
      header: 'S.No',
      cell: (teacher: Teacher) => {
        const index = filteredTeachers.findIndex(t => t.id === teacher.id);
        return <span className="font-bold text-muted-foreground">{index + 1}</span>;
      }
    },
    {
      header: 'Teacher Name',
      cell: (teacher: Teacher) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
            {teacher?.fullName?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground tracking-tight leading-none">{teacher?.fullName}</p>
            <p className="text-[10px] text-muted-foreground font-black mt-1 uppercase tracking-widest">{teacher?.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Employee ID',
      cell: (teacher: Teacher) => (
        <div className="flex items-center gap-2">
          <BadgeCheck size={14} className="text-primary" />
          <span className="font-black text-xs tracking-widest uppercase">{teacher.empId}</span>
        </div>
      )
    },
    {
      header: 'Classes',
      cell: (teacher: Teacher) => {
        const classNames = teacher.classIds.map(id => classes.find(c => c.id === id)?.className || id).join(', ');
        return (
          <div className="flex items-center gap-2 max-w-[150px] truncate">
            <span className="font-bold text-xs bg-secondary px-2 py-1 rounded-md">{classNames || 'None'}</span>
          </div>
        );
      }
    },
    {
      header: 'Subjects',
      cell: (teacher: Teacher) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {teacher.subjects?.slice(0, 2).map(sub => (
            <span key={sub} className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-md border border-primary/10">
              {sub}
            </span>
          ))}
          {teacher.subjects?.length > 2 && <span className="text-[10px] font-bold text-muted-foreground">+{teacher.subjects.length - 2} more</span>}
        </div>
      )
    },
    {
       header: 'Status',
       cell: (teacher: Teacher) => (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${teacher.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
             {teacher.status}
          </span>
       )
    },
    {
      header: 'Actions',
      cell: (teacher: Teacher) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setViewingTeacher(teacher); setIsViewOpen(true); }}
            className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditingTeacher(teacher); setIsFormOpen(true); }}
            className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setTeacherToDelete(teacher.id); setIsDeleteOpen(true); }}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Teachers</h2>
          <p className="text-muted-foreground mt-1 font-medium">Manage faculty records and class assignments.</p>
        </div>
      </div>

      <FilterBar
        onSearch={setSearch}
        onFilterChange={setClassFilter}
        onAddClick={() => {
          setEditingTeacher(null);
          setIsFormOpen(true);
        }}
        addLabel="Add Teacher"
        placeholder="Search by name, ID, or subject..."
      />

      <DataTable
        columns={columns}
        data={filteredTeachers}
        isLoading={isLoadingTeachers || isLoadingClasses}
      />

      {/* View Modal */}
      <TeacherViewModal
        isOpen={isViewOpen}
        onClose={() => { setIsViewOpen(false); setViewingTeacher(null); }}
        teacher={viewingTeacher}
      />

      {/* Form Modal */}
      {isFormOpen && (
        <TeacherForm
          initialData={editingTeacher || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => { setIsFormOpen(false); setEditingTeacher(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Submit Confirmation Modal */}
      <ConfirmationModal
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        onConfirm={confirmSubmit}
        title="Confirm Teacher Details"
        message={`Are you sure you want to ${editingTeacher ? 'update' : 'add'} this teacher record?`}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setTeacherToDelete(null); }}
        onConfirm={() => {
          if (teacherToDelete) deleteMutation.mutate(teacherToDelete);
        }}
        title="Delete Teacher Record"
        message="This will permanently delete the teacher record. This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
