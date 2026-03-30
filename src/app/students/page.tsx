'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';
import DataTable from '@/components/tables/DataTable';
import FilterBar from '@/components/tables/FilterBar';
import { Student } from '@/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => studentService.getStudents(),
  });

  const filteredStudents = students?.filter(student =>
    student?.firstName.toLowerCase().includes(search.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const columns = [
    {
      header: 'Student',
      cell: (student: Student) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">
            {student?.firstName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground tracking-tight">{student?.firstName}</p>
            <p className="text-xs text-muted-foreground font-medium">Roll: {student.rollNumber}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Class',
      cell: (student: Student) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
          {student.class}{student.section}
        </span>
      )
    },
    {
      header: 'Guardian',
      accessorKey: 'parentName' as keyof Student,
    },
    {
      header: 'Attendance',
      cell: (student: Student) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                student.attendanceRate > 90 ? "bg-green-500" : "bg-amber-500"
              )}
              style={{ width: `${student.attendanceRate}%` }}
            />
          </div>
          <span className="text-xs font-bold">{student.attendanceRate}%</span>
        </div>
      )
    },
    {
      header: 'Fee Status',
      cell: (student: Student) => (
        <span className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
          student.feeStatus === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {student.feeStatus}
        </span>
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
        addLabel="Enroll Student"
        placeholder="Search by name or roll number..."
      />

      <DataTable
        columns={columns}
        data={filteredStudents}
        isLoading={isLoading}
        onRowClick={(student) => router.push(`/students/${student.id}`)}
      />
    </div>
  );
}
