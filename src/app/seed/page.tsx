'use client';

import { useState } from 'react';
import { classService, sectionService, branchService } from '../../services/firebase/masterDataService';
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
