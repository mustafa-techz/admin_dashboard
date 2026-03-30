'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, markAttendance } from '@/services/mockApi';
import DataTable from '@/components/tables/DataTable';
import FilterBar from '@/components/tables/FilterBar';
import { Student } from '@/types';
import { Check, X, Calendar as CalendarIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AttendancePage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  
  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'present' | 'absent' }) => 
      markAttendance(id, status),
    onSuccess: () => {
      // In a real app, we would invalidate the attendance query
      alert('Attendance updated successfully!');
    }
  });

  const filteredStudents = students?.filter(student => 
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    student.class.includes(search)
  ) || [];

  const columns = [
    {
      header: 'Student',
      cell: (student: Student) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xs">
            {student.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground tracking-tight text-sm">{student.name}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Class {student.class}{student.section}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Status Today',
      cell: (student: Student) => (
        <div className="flex items-center gap-2">
            <button 
              onClick={() => mutation.mutate({ id: student.id, status: 'present' })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border",
                "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
              )}
            >
              <Check size={14} strokeWidth={3} />
              PRESENT
            </button>
            <button 
              onClick={() => mutation.mutate({ id: student.id, status: 'absent' })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border",
                "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              )}
            >
              <X size={14} strokeWidth={3} />
              ABSENT
            </button>
        </div>
      )
    },
    {
      header: 'Monthly Avg',
      cell: (student: Student) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
             <div 
               className={cn("h-full rounded-full transition-all duration-1000 bg-primary")} 
               style={{ width: `${student.attendanceRate}%` }} 
             />
          </div>
          <span className="text-[10px] font-black">{student.attendanceRate}%</span>
        </div>
      )
    },
    {
        header: 'Actions',
        cell: () => (
          <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <Info size={18} />
          </button>
        ),
        className: 'text-right'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Attendance</h2>
          <p className="text-muted-foreground mt-1 font-medium italic">Mark and track student presence for today.</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-2xl shadow-soft">
            <CalendarIcon size={18} className="text-primary" />
            <span className="text-sm font-black">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-50 border border-green-100 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Present Today</p>
              <h3 className="text-3xl font-black text-green-700">334</h3>
          </div>
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Absent Today</p>
              <h3 className="text-3xl font-black text-red-700">66</h3>
          </div>
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Strength</p>
              <h3 className="text-3xl font-black text-foreground">400</h3>
          </div>
      </div>

      <FilterBar 
        onSearch={setSearch} 
        placeholder="Filter by name or class..."
      />

      <DataTable 
        columns={columns} 
        data={filteredStudents} 
        isLoading={isLoading}
      />

      <div className="flex justify-end pt-4">
          <button className="px-8 py-3 bg-foreground text-background rounded-2xl font-black text-sm hover:scale-105 transition-transform shadow-xl shadow-foreground/10">
              Submit All Changes
          </button>
      </div>
    </div>
  );
}
