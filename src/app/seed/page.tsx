'use client';

import { useState } from 'react';
import { classService, sectionService, branchService, subjectService, timeSlotService } from '../../services/firebase/masterDataService';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SeedPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const seedData = async () => {
    setStatus('loading');
    setMessage('Seeding data...');
    try {
      // Seed Classes
      for (let i = 1; i <= 10; i++) {
        await classService.addClass({ classId: i.toString(), className: i.toString() });
      }

      // Seed Branches
      const branches = ['Mumbai', 'Delhi', 'Hyderabad'];
      for (const branch of branches) {
        await branchService.addBranch({ branchId: branch, branchName: branch });
      }

      // Seed Sections
      const sections = ['A', 'B', 'C', 'D'];
      for (const section of sections) {
        await sectionService.addSection({ sectionId: section, sectionName: section });
      }

      // Seed Subjects
      const subjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science', 'Art', 'PE'];
      for (const subject of subjects) {
        await subjectService.addSubject({ subjectId: subject.toLowerCase().replace(' ', '-'), subjectName: subject });
      }

      // Seed Time Slots (7:00 AM - 1:00 PM)
      const slots = [
        { start: '07:00', end: '08:00', label: '7:00 AM - 8:00 AM' },
        { start: '08:00', end: '09:00', label: '8:00 AM - 9:00 AM' },
        { start: '09:00', end: '10:00', label: '9:00 AM - 10:00 AM' },
        { start: '10:00', end: '11:00', label: '10:00 AM - 11:00 AM' },
        { start: '11:00', end: '12:00', label: '11:00 AM - 12:00 AM' },
        { start: '12:00', end: '13:00', label: '12:00 PM - 01:00 PM' },
      ];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        await timeSlotService.addTimeSlot({
          timeSlotId: `slot-${i + 1}`,
          startTime: slot.start,
          endTime: slot.end,
          label: slot.label
        });
      }

      setStatus('success');
      setMessage('Successfully seeded all master data!');
    } catch (error) {
      console.error('Seeding error:', error);
      setStatus('error');
      setMessage('Error seeding data. Check console.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <h1 className="text-3xl font-black italic tracking-tighter">Master Data Seeder</h1>
      <p className="text-muted-foreground text-center max-w-md">
        This will populate your Firestore collections with Classes (1-10), 
        Branches (Mumbai, Delhi, Hyderabad), and Sections (A-D).
      </p>
      
      <button
        onClick={seedData}
        disabled={status === 'loading' || status === 'success'}
        className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-50"
      >
        {status === 'loading' && <Loader2 className="animate-spin" />}
        {status === 'success' && <CheckCircle2 />}
        {status === 'error' && <AlertCircle />}
        {status === 'idle' ? 'Seed Now' : message}
      </button>

      {status === 'success' && (
        <p className="text-green-600 font-bold animate-in fade-in slide-in-from-top-2">
          Master data is ready! You can now close this page.
        </p>
      )}
    </div>
  );
}
