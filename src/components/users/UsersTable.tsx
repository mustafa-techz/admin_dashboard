'use client';

import { User } from '@/types/user';
import DataTable from '@/components/tables/DataTable';
import { Edit, Eye, Trash2 } from 'lucide-react';

interface UsersTableProps {
  users: User[];
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  isLoading?: boolean;
}

type UserTableRow = User & {
  id: string;
  sr: number;
};

export default function UsersTable({ users, onView, onEdit, onDelete, isLoading }: UsersTableProps) {
  const transformData: UserTableRow[] = users.map((user, index) => ({
    ...user,
    id: user.uid,
    sr: index + 1,
  }));

  const columns = [
    {
      header: 'SR',
      cell: (row: UserTableRow) => <span>{row.sr}</span>,
      className: 'w-16',
    },
    {
      header: 'Name',
      accessorKey: 'name' as keyof UserTableRow,
    },
    {
      header: 'Email',
      accessorKey: 'email' as keyof UserTableRow,
    },
    {
      header: 'Role',
      cell: (row: UserTableRow) => (
        <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-primary/10 text-primary">
          {row.role}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row: UserTableRow) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(row);
            }}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-blue-600"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-yellow-600"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-red-600"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
      className: 'w-32',
    },
  ];

  return <DataTable columns={columns} data={transformData} isLoading={isLoading} />;
}
