'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSubAdmins } from '@/services/mockApi';
import DataTable from '@/components/tables/DataTable';
import FilterBar from '@/components/tables/FilterBar';
import { SubAdmin } from '@/types';
import { Shield, Mail, Key, Trash2 } from 'lucide-react';

export default function SubAdminsPage() {
  const [search, setSearch] = useState('');
  
  const { data: subAdmins, isLoading } = useQuery({
    queryKey: ['subAdmins'],
    queryFn: getSubAdmins,
  });

  const filteredSubAdmins = subAdmins?.filter(admin => 
    admin.name.toLowerCase().includes(search.toLowerCase()) ||
    admin.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const columns = [
    {
      header: 'Sub Admin',
      cell: (admin: SubAdmin) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
            {admin.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground tracking-tight">{admin.name}</p>
            <p className="text-xs text-muted-foreground font-medium">{admin.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      cell: () => (
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-primary" />
          <span className="text-xs font-black uppercase tracking-widest text-foreground">Management</span>
        </div>
      )
    },
    {
      header: 'Permissions',
      cell: (admin: SubAdmin) => (
        <div className="flex flex-wrap gap-1">
          {admin.permissions.slice(0, 2).map((perm) => (
            <span key={perm} className="px-2 py-0.5 bg-secondary text-[10px] font-bold rounded-lg border border-border">
              {perm.replace('-', ' ')}
            </span>
          ))}
          {admin.permissions.length > 2 && (
            <span className="px-2 py-0.5 bg-secondary text-[10px] font-bold rounded-lg border border-border">
              +{admin.permissions.length - 2}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      cell: () => (
        <div className="flex items-center gap-2 justify-end">
          <button className="p-2 bg-secondary/50 rounded-xl text-muted-foreground hover:text-primary transition-colors">
            <Key size={16} />
          </button>
          <button className="p-2 bg-red-50 rounded-xl text-red-500 hover:bg-red-100 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Sub Admins</h2>
          <p className="text-muted-foreground mt-1 font-medium">Manage administrative access and permissions.</p>
        </div>
      </div>

      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl mb-8 flex items-start gap-4">
          <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
              <Shield size={24} />
          </div>
          <div>
              <h3 className="font-bold text-indigo-900">Administrative Control</h3>
              <p className="text-sm text-indigo-700 font-medium">As a Super Admin, you can manage sub-admins and their restricted access to school modules.</p>
          </div>
      </div>

      <FilterBar 
        onSearch={setSearch} 
        addLabel="Invite Admin"
        placeholder="Search by name or email..."
      />

      <DataTable 
        columns={columns} 
        data={filteredSubAdmins} 
        isLoading={isLoading}
      />
    </div>
  );
}
