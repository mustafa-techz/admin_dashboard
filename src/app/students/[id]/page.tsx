'use client';

import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Mail, Phone, MapPin, Calendar, CreditCard, Award, ArrowRight, Loader2 } from 'lucide-react';
import StatCircle from '@/components/shared/StatCircle';
import { cn } from '@/lib/utils';
import { Student } from '@/types';

export default function StudentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const { data: student, isLoading } = useQuery<Student | null>({
    queryKey: ['student', id],
    queryFn: () => studentService.getStudentById(id as string),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="p-12 text-center flex flex-col items-center gap-2">
      <Loader2 size={32} className="animate-spin text-primary" />
      <p className="text-sm font-bold text-muted-foreground">Fetching student data...</p>
    </div>
  );
  if (!student) return <div className="p-8 text-center text-red-500 font-bold">Student not found!</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group"
      >
        <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        Back to Students
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-3xl border border-border shadow-soft p-8 text-center">
            <div className="relative inline-block mb-6">
               <div className="h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-black text-5xl shadow-inner border border-primary/20">
                {student.name.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-green-500 rounded-2xl flex items-center justify-center text-white border-4 border-card">
                <Award size={18} />
              </div>
            </div>
            
            <h2 className="text-2xl font-black tracking-tight">{student.name}</h2>
            <p className="text-sm font-bold text-muted-foreground mb-6 uppercase tracking-widest">Roll NO: {student.rollNumber}</p>
            
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="p-4 bg-secondary rounded-2xl border border-border/50">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Class</p>
                <p className="text-lg font-black text-foreground">{student.class}{student.section}</p>
              </div>
              <div className="p-4 bg-secondary rounded-2xl border border-border/50">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Status</p>
                <p className={cn(
                  "text-lg font-black",
                  student.feeStatus === 'paid' ? "text-green-600" : "text-red-600"
                )}>Active</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-border shadow-soft p-8 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Personal Information</h3>
            <div className="flex items-center gap-4 group">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Mail size={18} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Email</p>
                <p className="text-sm font-bold truncate">{student.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Phone size={18} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Contact</p>
                <p className="text-sm font-bold">{student.contact}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <MapPin size={18} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Address</p>
                <p className="text-sm font-bold">{student.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details and Stats */}
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-card rounded-3xl border border-border shadow-soft p-8 flex flex-col items-center justify-center border-b-4 border-b-primary/50">
                 <StatCircle 
                    value={student.attendanceRate} 
                    total={100} 
                    label="Current Attendance"
                    size={180}
                 />
                 <div className="mt-4 p-4 bg-primary/5 rounded-2xl w-full text-center">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Consistency</p>
                    <p className="text-sm font-bold text-foreground">Top 5% in Class</p>
                 </div>
              </div>

              <div className="bg-card rounded-3xl border border-border shadow-soft p-8 flex flex-col border-b-4 border-b-amber-400">
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                      <CreditCard size={24} />
                    </div>
                    <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        student.feeStatus === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                        {student.feeStatus}
                    </span>
                  </div>

                  <h3 className="text-xl font-black tracking-tight mb-2">Fee Summary</h3>
                  <p className="text-sm text-muted-foreground font-medium mb-6">Last payment received on Jan 15, 2026.</p>
                  
                  <div className="space-y-3 mt-auto">
                      <div className="flex justify-between items-center p-3 bg-secondary rounded-xl">
                          <span className="text-xs font-bold text-muted-foreground">Total Fees</span>
                          <span className="text-sm font-black">$4,500</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary rounded-xl">
                          <span className="text-xs font-bold text-muted-foreground">Outstanding</span>
                          <span className="text-sm font-black">$0</span>
                      </div>
                  </div>
              </div>
           </div>

           <div className="bg-card rounded-3xl border border-border shadow-soft p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight">Academic Progress</h3>
                <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
                  Download Report <ArrowRight size={14} />
                </button>
              </div>

              <div className="space-y-6">
                {[
                  { subject: 'Mathematics', progress: 85, color: 'bg-primary' },
                  { subject: 'Science', progress: 92, color: 'bg-green-500' },
                  { subject: 'History', progress: 78, color: 'bg-amber-500' },
                  { subject: 'English', progress: 88, color: 'bg-indigo-500' },
                ].map((item) => (
                  <div key={item.subject} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">{item.subject}</span>
                      <span className="text-xs font-black text-muted-foreground uppercase">{item.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-1000", item.color)} 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
