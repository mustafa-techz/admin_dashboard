'use client';

import React, { useState } from 'react';
import { useMasterData } from '../../hooks/useMasterData';
import { useTimetable } from '../../hooks/useTimetable';
import TimetableGrid from '../../components/timetable/TimetableGrid';
import TimetableModal from '../../components/timetable/TimetableModal';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import { Calendar, Users, GraduationCap, Search, Plus, Filter, Loader2 } from 'lucide-react';
import { TimetableEntry, TimetableFormData } from '../../types/timetable';

export default function AdminTimetablePage() {
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [teacherSearch, setTeacherSearch] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | undefined>(undefined);
  const [modalContext, setModalContext] = useState<{ day: string; timeSlotId: string } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  // Data fetching
  const { classes, sections, teachers, branches, isLoading: isMasterLoading } = useMasterData();
  const { 
    classTimetable, 
    teacherTimetable, 
    isLoading: isTimetableLoading,
    addEntry,
    updateEntry,
    deleteEntry 
  } = useTimetable(
    viewMode === 'class' ? selectedClass : undefined, 
    viewMode === 'class' ? selectedSection : undefined,
    viewMode === 'teacher' ? selectedTeacher : undefined
  );

  const filteredTeachers = teachers.filter(t => 
    t.fullName.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const entries = viewMode === 'class' ? classTimetable : teacherTimetable;

  const handleCellClick = (day: string, timeSlotId: string, entry?: TimetableEntry) => {
    setEditingEntry(entry);
    setModalContext({ day, timeSlotId });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteEntryId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteEntryId) {
      await deleteEntry(deleteEntryId);
      setIsDeleteModalOpen(false);
    }
  };

  const handleModalSubmit = async (values: TimetableFormData) => {
    if (editingEntry) {
      await updateEntry({ id: editingEntry.id, entry: values });
    } else {
      await addEntry(values);
    }
  };

  const canShowGrid = viewMode === 'class' 
    ? (selectedClass && selectedSection) 
    : selectedTeacher;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Timetable Master</h2>
          <p className="text-muted-foreground mt-1 font-medium">Manage and view school schedules for classes and teachers.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-card p-1 rounded-xl border border-border shadow-soft">
            <button
              onClick={() => setViewMode('class')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                viewMode === 'class' 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <GraduationCap size={16} />
              Class Wise
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                viewMode === 'teacher' 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Users size={16} />
              Teacher Wise
            </button>
          </div>

          <button
            onClick={() => {
              setEditingEntry(undefined);
              setModalContext(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            Schedule New
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        {viewMode === 'class' ? (
          <>
            <div className="relative flex-1 w-full">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="block w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
              >
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.classId}>Class {c.className}</option>)}
              </select>
            </div>
            <div className="relative flex-1 w-full">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="block w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
              >
                <option value="">All Sections</option>
                {sections.map(s => <option key={s.id} value={s.sectionId}>Section {s.sectionName}</option>)}
              </select>
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search teacher..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-card border border-border rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
              />
            </div>
            <div className="relative flex-1 w-full">
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="block w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
              >
                <option value="">Select Teacher</option>
                {filteredTeachers.map(t => <option key={t.id} value={t.teacherId}>{t.fullName}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Grid Status / Info */}
      {canShowGrid && (
        <div className="flex items-center gap-2 px-1">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            {viewMode === 'class' 
              ? `Schedule: Class ${selectedClass} - ${selectedSection}` 
              : `Schedule: ${teachers.find(t => t.teacherId === selectedTeacher)?.fullName}`}
          </h3>
        </div>
      )}

      {/* Main Timetable Content */}
      {canShowGrid ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
             <TimetableGrid 
               entries={entries}
               isLoading={isTimetableLoading}
               isAdmin={true}
               onCellClick={handleCellClick}
               onDeleteEntry={handleDeleteClick}
             />
          </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl p-16 flex flex-col items-center justify-center space-y-4 shadow-soft">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
                <Calendar size={32} className="text-muted-foreground/50" />
            </div>
            <div className="text-center">
                <h4 className="text-lg font-bold text-foreground">Awaiting Selection</h4>
                <p className="text-sm text-muted-foreground">Select a class or teacher to view their weekly schedule.</p>
            </div>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && modalContext && (
        <TimetableModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          initialValues={editingEntry}
          classId={viewMode === 'class' ? selectedClass : undefined}
          sectionId={viewMode === 'class' ? selectedSection : undefined}
          day={modalContext.day}
          timeSlotId={modalContext.timeSlotId}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Session?"
        message="This will permanently delete this timetable entry. This action cannot be undone."
        confirmText="Remove"
        type="danger"
      />
    </div>
  );
}
