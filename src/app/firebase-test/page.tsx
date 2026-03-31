'use client';

import { useState } from "react";
import { useStudents } from "../../hooks/useStudents";
import { Plus, Trash2, Edit2, Loader2, Database } from "lucide-react";
import { AddressDetails, ParentDetails } from "@/types/student";

export default function FirebaseTestPage() {
  const { students, isLoading, addStudent, updateStudent, deleteStudent, isAdding, isDeleting } = useStudents();
  const [fullName, setFullName] = useState("");

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    await addStudent({
      fullName,
      classId: "10",
      sectionId: "A",
      rollNumber: Math.floor(Math.random() * 1000).toString(),
      parentId: "",
      dateOfBirth: "",
      admissionDate: "",
      branchId: "",
      bloodGroup: "",
      gender: "",
      parentDetails: {} as ParentDetails,
      addressDetails: {} as AddressDetails
    });

    setFullName("");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
          <Database size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Firebase Integration</h1>
          <p className="text-muted-foreground font-medium">Testing Firestore CRUD operations for Students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Container */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-3xl border border-border shadow-soft p-8 space-y-6">
            <h3 className="text-xl font-black tracking-tight">Add New Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">First Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John"
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Add Student
              </button>
            </form>
          </div>
        </div>

        {/* List Container */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-3xl border border-border shadow-soft overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight">Student List (Live Firestore)</h3>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                {students.length} Students
              </span>
            </div>

            <div className="divide-y divide-border">
              {isLoading ? (
                <div className="p-12 text-center flex flex-col items-center gap-2">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm font-bold text-muted-foreground">Fetching Firestore documents...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-medium italic">
                  No students found in the database.
                </div>
              ) : (
                students.map((student) => (
                  <div key={student.id} className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-primary font-black text-xl">
                        {student.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-lg tracking-tight">{student.fullName}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          Roll: {student.rollNumber} | Class {student.classId}{student.sectionId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => updateStudent({ id: student.id!, data: { fullName: student.fullName + " Updated" } })}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteStudent(student.id!)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
