import { X, User, Phone, MapPin, Calendar, BookOpen, GraduationCap, Mail } from 'lucide-react';
import { Teacher } from '@/types/teacher';
import { useQuery } from '@tanstack/react-query';
import { classService } from '@/services/firebase/masterDataService';

interface TeacherViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
}

export default function TeacherViewModal({ isOpen, onClose, teacher }: TeacherViewModalProps) {
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
  });

  if (!isOpen || !teacher) return null;

  const classTeacherName = classes.find(c => c.id === teacher.classTeacher)?.className || 'None';
  const taughtClasses = teacher.classIds.map(id => classes.find(c => c.id === id)?.className || id).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner border border-primary/20">
              {teacher.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight leading-none">{teacher.fullName}</h3>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 block">Emp ID: {teacher.empId}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section: Academic/Professional */}
          <div className="bg-secondary p-4 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <GraduationCap size={18} />
              <h4 className="font-bold text-sm tracking-tight text-foreground">Faculty Profile</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Class Teacher Of</p>
                <p className="text-sm font-bold">Class {classTeacherName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Joining Date</p>
                <p className="text-sm font-bold">{teacher.joiningDate}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Classes Taught</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {teacher.classIds.map(id => {
                    const name = classes.find(c => c.id === id)?.className || id;
                    return <span key={id} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-md border border-primary/20">CLASS {name}</span>;
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Subjects */}
          <div className="bg-secondary p-4 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <BookOpen size={18} />
              <h4 className="font-bold text-sm tracking-tight text-foreground">Subjects</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {teacher.subjects.map(sub => (
                <span key={sub} className="px-3 py-1 bg-background border border-border text-xs font-bold rounded-lg shadow-sm">{sub}</span>
              ))}
            </div>
          </div>

          {/* Section: Contact & Personal */}
          <div className="bg-secondary p-4 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Mail size={18} />
              <h4 className="font-bold text-sm tracking-tight text-foreground">Contact & Personal</h4>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Email</p>
                <p className="text-sm font-bold truncate">{teacher.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Gender</p>
                <p className="text-sm font-bold">{teacher.gender}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Date of Birth</p>
                <p className="text-sm font-bold">{teacher.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${teacher.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {teacher.status}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Address */}
          <div className="bg-secondary p-4 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <MapPin size={18} />
              <h4 className="font-bold text-sm tracking-tight text-foreground">Address</h4>
            </div>
            <div>
              <p className="text-sm font-bold">{teacher.addressDetails?.street}</p>
              <p className="text-sm font-bold text-muted-foreground">
                {teacher.addressDetails?.city}, {teacher.addressDetails?.state} - {teacher.addressDetails?.pincode}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold bg-secondary hover:bg-secondary/80 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
