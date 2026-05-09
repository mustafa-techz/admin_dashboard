'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { branchService } from '@/services/firebase/masterDataService';
import { useFeeStructures, useBranchFeeAssignments, useFeeInstallments, useAssignFeeToStudents, useDeleteFeeStructure } from '@/hooks/useFees';
import { studentService } from '@/services/studentService';
import { formatINR } from '@/lib/feeUtils';
import { cn } from '@/lib/utils';
import type { FeeStructure } from '@/types/fees';
import { IndianRupee, Users, Clock, ChevronRight, Check, Loader2, UserPlus, Trash2 } from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';


export default function FeeStructuresList() {
  const [selectedStructure, setSelectedStructure] = useState<FeeStructure | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState<string | null>(null);

  const { data: selectedBranch } = useQuery({
    queryKey: ['selectedBranch'],
    queryFn: () => {
      const saved = localStorage.getItem('selectedBranch');
      return saved ? JSON.parse(saved) : null;
    },
    initialData: null,
  });

  const branchId = selectedBranch?.id ?? '';
  const { data: feeStructures = [], isLoading } = useFeeStructures(branchId);

  // Always fetch all branch assignments to show summary stats in the grid correctly
  // and to know which structures have assignments (for delete button visibility)
  const { data: assignments = [] } = useBranchFeeAssignments(branchId);

  const deleteMutation = useDeleteFeeStructure();

  const handleDelete = () => {
    if (structureToDelete) {
      deleteMutation.mutate(structureToDelete, {
        onSuccess: () => {
          setStructureToDelete(null);
          if (selectedStructure?.id === structureToDelete) {
            setSelectedStructure(null);
          }
        }
      });
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (feeStructures.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <IndianRupee size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No Fee Structures Yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first fee structure from the &quot;Create Fee&quot; tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Structures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feeStructures.map((structure) => {
          const structAssignments = assignments.filter(
            (a) => a.feeStructureId === structure.id
          );

          const totalCollected = structAssignments.reduce((s, a) => s + a.totalPaid, 0);
          const totalPending = structAssignments.reduce((s, a) => s + a.totalPending, 0);
          const isSelected = selectedStructure?.id === structure.id;

          return (
            <div
              key={structure.id}
              onClick={() => setSelectedStructure(isSelected ? null : structure)}
              className={cn(
                'text-left bg-card rounded-2xl border-2 shadow-soft p-5 transition-all duration-200 hover:shadow-md group cursor-pointer',
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-foreground">{structure.feeName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{structure.academicYear}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStructureToDelete(structure.id); // Always works now
                    }}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>

                  <ChevronRight
                    size={20}
                    className={cn(
                      'text-muted-foreground transition-transform',
                      isSelected && 'rotate-90 text-primary'
                    )}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
                  <p className="text-sm font-black text-foreground">{formatINR(structure.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Collected</p>
                  <p className="text-sm font-black text-emerald-600">{formatINR(totalCollected)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
                  <p className="text-sm font-black text-amber-600">{formatINR(totalPending)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Users size={12} />
                <span>{structAssignments.length} students assigned</span>
                <span className="mx-1">·</span>
                <Clock size={12} />
                <span>{structure.installmentCount} installments</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Structure Detail */}
      {selectedStructure && (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 animate-in slide-in-from-top-2 duration-300 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-foreground">
              {selectedStructure.feeName} — Students
            </h3>
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] flex items-center gap-1.5"
            >
              <UserPlus size={14} /> Assign to Students
            </button>
          </div>

          {assignments.filter((a) => a.feeStructureId === selectedStructure.id).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No students assigned yet. Click &quot;Assign to Students&quot; to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Student</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Paid</th>
                    <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending</th>
                    <th className="text-center py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments
                    .filter((a) => a.feeStructureId === selectedStructure.id)
                    .map((assignment) => (
                      <tr key={assignment.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium">{assignment.studentName}</td>
                        <td className="py-3 text-right font-bold">{formatINR(assignment.totalAmount)}</td>
                        <td className="py-3 text-right font-bold text-emerald-600">{formatINR(assignment.totalPaid)}</td>
                        <td className="py-3 text-right font-bold text-amber-600">{formatINR(assignment.totalPending)}</td>
                        <td className="py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              assignment.status === 'paid' && 'bg-emerald-100 text-emerald-700',
                              assignment.status === 'partial' && 'bg-blue-100 text-blue-700',
                              assignment.status === 'pending' && 'bg-amber-100 text-amber-700',
                              assignment.status === 'overdue' && 'bg-red-100 text-red-700'
                            )}
                          >
                            {assignment.status === 'paid' && <Check size={10} />}
                            {assignment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedStructure && (
        <AssignFeeModal
          feeStructure={selectedStructure}
          branchId={branchId}
          onClose={() => setShowAssignModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!structureToDelete}
        onClose={() => setStructureToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Fee Structure"
        message="Are you sure you want to delete this fee structure? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Assign Fee Modal
// ─────────────────────────────────────────────────────────────────
function AssignFeeModal({
  feeStructure,
  branchId,
  onClose,
}: {
  feeStructure: FeeStructure;
  branchId: string;
  onClose: () => void;
}) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentService.getStudents(),
  });

  const { data: installments = [] } = useFeeInstallments(feeStructure.id);
  const assignMutation = useAssignFeeToStudents();


  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(query) ||
        s.rollNumber.toLowerCase().includes(query)
    );
  }, [students, search]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleAssign = async () => {
    const selectedList = students
      .filter((s) => selectedStudents.has(s.id))
      .map((s) => ({ id: s.id, fullName: s.fullName, userId: s.parentDetails?.userId }));

    await assignMutation.mutateAsync({
      students: selectedList,
      feeStructure,
      installments,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-black">Assign: {feeStructure.feeName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select students to assign this fee structure ({formatINR(feeStructure.totalAmount)})
          </p>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="mt-3 w-full px-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingStudents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleAll}
                className="w-full px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-all text-left"
              >
                {selectedStudents.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
              </button>

              {filteredStudents.map((student) => (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all text-sm',
                    selectedStudents.has(student.id)
                      ? 'bg-primary/5 text-foreground'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                      selectedStudents.has(student.id)
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    )}
                  >
                    {selectedStudents.has(student.id) && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{student.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">{student.rollNumber}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={selectedStudents.size === 0 || assignMutation.isPending}
              className={cn(
                'px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-[0.98]',
                selectedStudents.size > 0
                  ? 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
              )}
            >
              {assignMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Assigning...
                </span>
              ) : (
                'Assign Fee'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
