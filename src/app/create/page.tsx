'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { classService, sectionService, branchService } from '@/services/firebase/masterDataService';
import MasterDataModal from '@/components/shared/MasterDataModal';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

type DataType = 'class' | 'section' | 'branch';

export default function CreatePage() {
  const queryClient = useQueryClient();
  const [searchTerms, setSearchTerms] = useState({ class: '', section: '', branch: '' });

  // Modal States
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: DataType | null;
    mode: 'add' | 'edit';
    initialData: any | null;
  }>({
    isOpen: false,
    type: null,
    mode: 'add',
    initialData: null,
  });

  const [deleteId, setDeleteId] = useState<{ id: string; type: DataType } | null>(null);

  // Queries
  const { data: classes = [], isLoading: loadingClasses } = useQuery({ queryKey: ['classes'], queryFn: classService.getClasses });
  const { data: sections = [], isLoading: loadingSections } = useQuery({ queryKey: ['sections'], queryFn: sectionService.getSections });
  const { data: branches = [], isLoading: loadingBranches } = useQuery({ queryKey: ['branches'], queryFn: branchService.getBranches });

  // Mutations
  const classMutation = useMutation({
    mutationFn: (data: any) => modalState.mode === 'add' ? classService.addClass(data) : classService.updateClass(modalState.initialData.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); closeModal(); },
  });

  const sectionMutation = useMutation({
    mutationFn: (data: any) => modalState.mode === 'add' ? sectionService.addSection(data) : sectionService.updateSection(modalState.initialData.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sections'] }); closeModal(); },
  });

  const branchMutation = useMutation({
    mutationFn: (data: any) => modalState.mode === 'add' ? branchService.addBranch(data) : branchService.updateBranch(modalState.initialData.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: DataType }) => {
      if (type === 'class') return classService.deleteClass(id);
      if (type === 'section') return sectionService.deleteSection(id);
      return branchService.deleteBranch(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.type + 'es' === 'sectiones' ? 'sections' : variables.type + 's'] });
      setDeleteId(null);
    },
  });

  const closeModal = () => setModalState({ isOpen: false, type: null, mode: 'add', initialData: null });

  const handleAdd = (type: DataType) => setModalState({ isOpen: true, type, mode: 'add', initialData: null });

  const handleEdit = (type: DataType, item: any) => setModalState({
    isOpen: true,
    type,
    mode: 'edit',
    initialData: item
  });

  const handleModalSubmit = (name: string) => {
    const type = modalState.type;
    if (type === 'class') classMutation.mutate({ className: name, classId: name });
    if (type === 'section') sectionMutation.mutate({ sectionName: name, sectionId: name });
    if (type === 'branch') branchMutation.mutate({ branchName: name, branchId: name });
  };

  const getTitle = () => {
    const prefix = modalState.mode === 'add' ? 'Add' : 'Edit';
    if (modalState.type === 'class') return `${prefix} Class`;
    if (modalState.type === 'section') return `${prefix} Section`;
    return `${prefix} Branch`;
  };

  const getPlaceholder = () => {
    if (modalState.type === 'class') return 'e.g., 10th';
    if (modalState.type === 'section') return 'e.g., A';
    return 'e.g., Main Branch';
  };

  const renderSection = (title: string, type: DataType, data: any[], isLoading: boolean) => {
    const filtered = data.filter(item => {
      const name = type === 'class' ? item.className : type === 'section' ? item.sectionName : item.branchName;
      return name?.toLowerCase().includes(searchTerms[type].toLowerCase());
    });

    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-black tracking-tight">{title}</h3>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerms[type]}
                onChange={(e) => setSearchTerms({ ...searchTerms, [type]: e.target.value })}
                className="pl-9 pr-4 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64"
              />
            </div>
            <button
              onClick={() => handleAdd(type)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:scale-105 transition-transform"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground w-20">S.No</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Name</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-sm font-medium text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-sm font-medium text-muted-foreground">No records found.</td></tr>
              ) : filtered.map((item, index) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-muted-foreground">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-black text-foreground">
                    {type === 'class' ? item.className : type === 'section' ? item.sectionName : item.branchName}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(type, item)}
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId({ id: item.id, type })}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground">Master Data Management</h2>
        <p className="text-muted-foreground mt-1 font-medium italic">Configure your school's classes, sections, and branches.</p>
      </div>

      <div className="space-y-12 pb-12">
        {renderSection('Classes', 'class', classes, loadingClasses)}
        {renderSection('Sections', 'section', sections, loadingSections)}
        {renderSection('Branches', 'branch', branches, loadingBranches)}
      </div>

      {modalState.isOpen && (
        <MasterDataModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          title={getTitle()}
          placeholder={getPlaceholder()}
          initialValue={modalState.initialData ? (modalState.type === 'class' ? modalState.initialData.className : modalState.type === 'section' ? modalState.initialData.sectionName : modalState.initialData.branchName) : ''}
          isLoading={classMutation.isPending || sectionMutation.isPending || branchMutation.isPending}
        />
      )}

      {deleteId && (
        <ConfirmationModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          title={`Delete ${deleteId.type.charAt(0).toUpperCase() + deleteId.type.slice(1)}`}
          message="Are you sure you want to delete this? This action cannot be undone."
          type="danger"
          confirmText="Delete"
        />
      )}
    </div>
  );
}
