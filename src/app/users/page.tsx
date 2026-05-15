'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers } from '@/hooks/useUsers';
import { User, UserRole, CreateUserData, UpdateUserData } from '@/types/user';
import { useAuthStore } from '@/store/authStore';
import UsersTable from '@/components/users/UsersTable';
import UserFilterBar from '@/components/users/UserFilterBar';
import dynamic from 'next/dynamic';

const CreateUserModal = dynamic(() => import('@/components/users/CreateUserModal'), { ssr: false });
const EditUserModal = dynamic(() => import('@/components/users/EditUserModal'), { ssr: false });
const ViewUserModal = dynamic(() => import('@/components/users/ViewUserModal'), { ssr: false });
import ConfirmationModal from '@/components/shared/ConfirmationModal';

export default function UsersPage() {
  const router = useRouter();
  const role = useAuthStore(state => state.role);
  const { users, isLoading, isError, error, createUser, updateUser, deleteUser, isCreating, isUpdating } = useUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | "" | "all_roles">('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  useEffect(() => {
    if (role && role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [role, router]);

  const filteredUsers = useMemo(() => {
    return users?.filter((user) => {
      const matchesSearch = 
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const isAllRoles = selectedRole === '' || selectedRole === 'all_roles';
      const matchesRole = isAllRoles || (user.role as string) === selectedRole;
      
      return matchesSearch && matchesRole;
    }) || [];
  }, [users, searchTerm, selectedRole]);

  const handleSetViewUser = useCallback((user: User) => setViewingUser(user), []);
  const handleSetEditUser = useCallback((user: User) => setEditingUser(user), []);
  const handleSetDeleteUser = useCallback((user: User) => setDeletingUser(user), []);

  const handleCreateUser = async (data: CreateUserData) => {
    try {
      await createUser(data);
    } catch (error) {
      console.error(error);
      alert('Failed to create user');
      throw error;
    }
  };

  const handleUpdateUser = async (data: UpdateUserData) => {
    try {
      await updateUser(data);
    } catch (error) {
      console.error(error);
      alert('Failed to update user');
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingUser) {
      try {
        await deleteUser(deletingUser.uid);
      } catch (error) {
        console.error(error);
        alert('Failed to delete user');
        throw error;
      }
    }
  };

  if (role && role !== 'admin') {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black italic tracking-tight">MANAGE USERS</h1>
        <p className="text-muted-foreground font-medium italic">Create and manage administrative accounts and roles.</p>
      </div>

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error instanceof Error ? error.message : 'Failed to load users.'}
        </div>
      )}

      <UserFilterBar
        onSearch={setSearchTerm}
        onRoleChange={setSelectedRole}
        onAddClick={() => setIsCreateModalOpen(true)}
      />

      <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
        <UsersTable
          users={filteredUsers}
          isLoading={isLoading}
          onView={handleSetViewUser}
          onEdit={handleSetEditUser}
          onDelete={handleSetDeleteUser}
        />
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        isLoading={isCreating}
      />

      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateUser}
        isLoading={isUpdating}
      />

      <ViewUserModal
        user={viewingUser}
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
      />

      <ConfirmationModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete ${deletingUser?.name}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
