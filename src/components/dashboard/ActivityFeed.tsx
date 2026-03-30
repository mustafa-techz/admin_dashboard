import { cn } from '@/lib/utils';
import { Calendar, User, CheckCircle, Clock } from 'lucide-react';

interface Activity {
  id: string;
  type: 'attendance' | 'new_student' | 'fee_payment' | 'teacher_alert';
  title: string;
  description: string;
  time: string;
  status: 'success' | 'pending' | 'alert';
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'attendance',
    title: 'Attendance Marked',
    description: 'Teacher John Doe marked attendance for Class 10A.',
    time: '10 mins ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'new_student',
    title: 'New Student Admission',
    description: 'Alice Johnson joined Class 10.',
    time: '2 hours ago',
    status: 'success',
  },
  {
    id: '3',
    type: 'fee_payment',
    title: 'Fee Payment Received',
    description: 'Fee for Charlie Smith (Class 10) received.',
    time: '4 hours ago',
    status: 'pending',
  },
];

export default function ActivityFeed() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold tracking-tight">Recent Activity</h3>
        <button className="text-xs font-semibold text-primary hover:underline">View All</button>
      </div>
      
      <div className="space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-4 group">
            <div className={cn(
              "shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
              activity.status === 'success' ? "bg-green-100 text-green-600" :
              activity.status === 'pending' ? "bg-amber-100 text-amber-600" :
              "bg-red-100 text-red-600"
            )}>
              {activity.type === 'attendance' && <Calendar size={18} />}
              {activity.type === 'new_student' && <User size={18} />}
              {activity.type === 'fee_payment' && <CheckCircle size={18} />}
              {activity.type === 'teacher_alert' && <Clock size={18} />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="text-sm font-bold text-foreground tracking-tight">{activity.title}</h4>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">{activity.time}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{activity.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
