import { X, User, Phone, MapPin, Droplet, BookOpen } from 'lucide-react';
import { Student } from '@/types/student';
import { useQuery } from '@tanstack/react-query';
import { classService, sectionService } from '@/services/firebase/masterDataService';

interface StudentViewModalProps {
   isOpen: boolean;
   onClose: () => void;
   student: Student | null;
}

export default function StudentViewModal({ isOpen, onClose, student }: StudentViewModalProps) {
   // Master Data Queries
   const { data: classes = [] } = useQuery({
      queryKey: ['classes'],
      queryFn: () => classService.getClasses(),
      staleTime: 5 * 60 * 1000,
   });

   const { data: sections = [] } = useQuery({
      queryKey: ['sections'],
      queryFn: () => sectionService.getSections(),
      staleTime: 5 * 60 * 1000,
   });

   if (!isOpen || !student) return null;

   const className = classes.find(c => c.id === student.classId)?.className || student.classId;
   const sectionName = sections.find(s => s.id === student.sectionId)?.sectionName || student.sectionId;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
         <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner border border-primary/20">
                     {student.fullName.charAt(0)}
                  </div>
                  <div>
                     <h3 className="text-xl font-black tracking-tight leading-none">{student.fullName}</h3>
                     <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 block">Roll No: {student.rollNumber || 'N/A'}</span>
                  </div>
               </div>
               <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted"
               >
                  <X size={20} />
               </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
               {/* Section: Academic */}
               <div className="bg-secondary p-4 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-4 text-primary">
                     <BookOpen size={18} />
                     <h4 className="font-bold text-sm tracking-tight text-foreground">Academic Profile</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Class & Section</p>
                        <p className="text-sm font-bold">Class {className} - Section {sectionName}</p>
                     </div>
                     <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Admission Date</p>
                        <p className="text-sm font-bold">{student.admissionDate}</p>
                     </div>
                  </div>
               </div>

               {/* Section: Personal */}
               <div className="bg-secondary p-4 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-4 text-primary">
                     <User size={18} />
                     <h4 className="font-bold text-sm tracking-tight text-foreground">Personal Details</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Date of Birth</p>
                        <p className="text-sm font-bold">{student.dateOfBirth}</p>
                     </div>
                     <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Gender</p>
                        <p className="text-sm font-bold">{student.gender}</p>
                     </div>
                     <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Blood Grp</p>
                        <div className="flex items-center gap-1 text-sm font-bold text-red-500"><Droplet size={14} /> {student.bloodGroup}</div>
                     </div>
                  </div>
               </div>

               {/* Section: Parent/Guardian */}
               <div className="bg-secondary p-4 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-4 text-primary">
                     <Phone size={18} />
                     <h4 className="font-bold text-sm tracking-tight text-foreground">Guardian Info</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                     <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Father's Name</p>
                        <p className="text-sm font-bold">{student.parentDetails?.fatherName}</p>
                     </div>
                     <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Mother's Name</p>
                        <p className="text-sm font-bold">{student.parentDetails?.motherName || 'N/A'}</p>
                     </div>
                     <div className="col-span-2">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Contact</p>
                        <p className="text-sm font-bold">{student.parentDetails?.phone}</p>
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
                     <p className="text-sm font-bold">{student.addressDetails?.street}</p>
                     <p className="text-sm font-bold text-muted-foreground">
                        {student.addressDetails?.city}, {student.addressDetails?.state} - {student.addressDetails?.pincode}
                     </p>
                  </div>
               </div>

            </div>
            <div className="p-4 border-t border-border flex justify-end">
               <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-secondary hover:bg-secondary/80 transition-colors"
               >
                  Close
               </button>
            </div>
         </div>
      </div>
   );
}
