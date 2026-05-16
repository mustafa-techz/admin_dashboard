'use client';

import { useAuthStore } from '@/store/authStore';
import { Mail, Shield, LogOut, Camera, GraduationCap, BookOpen, Hash, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';
import { classService, sectionService } from '@/services/firebase/masterDataService';
import { queryKeys } from '@/lib/queryKeys';

export default function ProfilePage() {
  const user = useAuthStore(state => state.user);
  const role = useAuthStore(state => state.role);
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Queries for Child Details (enabled if user is parent)
  const { data: student, isLoading: isStudentLoading } = useQuery({
    queryKey: queryKeys.students.byParent(user?.id ?? 'none'),
    queryFn: async () => {
      if (!user?.id) return null;
      let s = await studentService.getStudentByParentUserId(user.id);
      if (!s && user.studentRollNumber) {
        s = await studentService.getStudentByRollNumber(user.studentRollNumber);
      }
      return s;
    },
    enabled: !!user?.id && role === 'parent',
    staleTime: 5 * 60 * 1000,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
    staleTime: 5 * 60 * 1000,
    enabled: role === 'parent',
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getSections(),
    staleTime: 5 * 60 * 1000,
    enabled: role === 'parent',
  });

  const classNameString = classes.find(c => c.id === student?.classId)?.className || student?.classId || 'N/A';
  const sectionNameString = sections.find(s => s.id === student?.sectionId)?.sectionName || student?.sectionId || 'N/A';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Profile Info */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-card rounded-3xl border border-border shadow-soft p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-primary/10" />
            
            <div className="relative mt-4 mb-6 inline-block">
              <div className="h-32 w-32 rounded-3xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-primary font-black text-5xl">
                {user?.name?.charAt(0) ?? 'U'}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-xl shadow-lg border-2 border-card hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>

            <h2 className="text-2xl font-black tracking-tight">{user?.name}</h2>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{role}</p>
            
            <div className="mt-8 pt-8 border-t border-border space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                  <Mail size={16} />
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Email</p>
                  <p className="text-sm font-bold truncate">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-left">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Account Role</p>
                  <p className="text-sm font-bold capitalize">{role}</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-sm hover:bg-red-100 transition-colors border border-red-100 shadow-soft"
          >
            <LogOut size={18} />
            LOGOUT ACCOUNT
          </button>
        </div>

        {/* Child Details & Preferences */}
        <div className="flex-1 w-full space-y-6">
          {role === 'parent' && (
            <div className="bg-card rounded-3xl border border-border shadow-soft p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight leading-none">Child Details</h3>
                  <p className="text-xs text-muted-foreground mt-1">Associated student academic profile</p>
                </div>
              </div>

              {isStudentLoading ? (
                <div className="p-8 text-center space-y-3 bg-secondary/20 rounded-2xl border border-border">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fetching Child Details...</p>
                </div>
              ) : !student ? (
                <div className="p-8 text-center space-y-3 bg-secondary/20 rounded-2xl border border-border">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                  </div>
                  <p className="text-sm font-black text-foreground">No Child Linked</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    We couldn&apos;t find a student associated with your account ({user?.email}). Please contact the school administration if this is an error.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="p-4 bg-secondary/30 rounded-2xl border border-border flex items-center gap-4 group hover:border-primary/30 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <UserCheck size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Student Name</p>
                      <p className="text-sm font-bold text-foreground truncate">{student.fullName}</p>
                    </div>
                  </div>

                  {/* Class */}
                  <div className="p-4 bg-secondary/30 rounded-2xl border border-border flex items-center gap-4 group hover:border-primary/30 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Class</p>
                      <p className="text-sm font-bold text-foreground truncate">{classNameString}</p>
                    </div>
                  </div>

                  {/* Section */}
                  <div className="p-4 bg-secondary/30 rounded-2xl border border-border flex items-center gap-4 group hover:border-primary/30 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <Hash size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Section</p>
                      <p className="text-sm font-bold text-foreground truncate">{sectionNameString}</p>
                    </div>
                  </div>

                  {/* Roll No */}
                  <div className="p-4 bg-secondary/30 rounded-2xl border border-border flex items-center gap-4 group hover:border-primary/30 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <GraduationCap size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Roll Number</p>
                      <p className="text-sm font-bold text-foreground truncate">{student.rollNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
