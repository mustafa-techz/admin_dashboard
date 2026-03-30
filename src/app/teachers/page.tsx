'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeachers } from '@/services/mockApi';
import DataTable from '@/components/tables/DataTable';
import FilterBar from '@/components/tables/FilterBar';
import { Teacher } from '@/types';
import { MoreVertical, Mail, Phone, BookOpen } from 'lucide-react';

export default function TeachersPage() {
  const [search, setSearch] = useState('');
  
  const { data: teachers, isLoading } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: getTeachers,
  });

  const filteredTeachers = teachers?.filter(teacher => 
    teacher.name.toLowerCase().includes(search.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const columns = [
    {
      header: 'Teacher',
      cell: (teacher: Teacher) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {teacher.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground tracking-tight">{teacher.name}</p>
            <p className="text-xs text-muted-foreground font-medium">{teacher.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Subject',
      cell: (teacher: Teacher) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-secondary rounded-lg">
            <BookOpen size={14} className="text-primary" />
          </div>
          <span className="font-bold">{teacher.subject}</span>
        </div>
      )
    },
    {
      header: 'Class',
      accessorKey: 'class' as keyof Teacher,
    },
    {
      header: 'Experience',
      accessorKey: 'experience' as keyof Teacher,
    },
    {
      header: 'Contact',
      cell: (teacher: Teacher) => (
        <div className="flex items-center gap-3">
          <button className="p-2 bg-secondary/50 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
            <Mail size={16} />
          </button>
          <button className="p-2 bg-secondary/50 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
            <Phone size={16} />
          </button>
        </div>
      )
    },
    {
      header: '',
      cell: () => (
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors group-hover:bg-muted rounded-lg">
          <MoreVertical size={18} />
        </button>
      ),
      className: 'text-right'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Teachers</h2>
          <p className="text-muted-foreground mt-1 font-medium">Manage and view all registered faculty members.</p>
        </div>
      </div>

      <FilterBar 
        onSearch={setSearch} 
        onAddClick={() => alert('Add Teacher functionality coming soon!')}
        addLabel="Add Teacher"
        placeholder="Search by name or subject..."
      />

      <DataTable 
        columns={columns} 
        data={filteredTeachers} 
        isLoading={isLoading}
        onRowClick={(teacher) => console.log('Teacher clicked:', teacher.id)}
      />
    </div>
  );
}
