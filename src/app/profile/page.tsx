'use client';

import { useAuthStore } from '@/store/authStore';
import { User, Mail, Shield, LogOut, Camera, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, role, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Profile Info */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-card rounded-3xl border border-border shadow-soft p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-primary/10" />
            
            <div className="relative mt-4 mb-6 inline-block">
              <div className="h-32 w-32 rounded-3xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-primary font-black text-5xl">
                {user?.name.charAt(0)}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-xl shadow-lg border-2 border-card hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>

            <h2 className="text-2xl font-black tracking-tight">{user?.name}</h2>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{role}</p>
            
            <div className="mt-8 pt-8 border-t border-border space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                  <Mail size={16} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Email</p>
                  <p className="text-sm font-bold truncate">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-left">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
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

        {/* Settings / Security */}
        <div className="flex-1 w-full space-y-6">
          <div className="bg-card rounded-3xl border border-border shadow-soft p-8">
            <h3 className="text-xl font-black tracking-tight mb-6">Security Settings</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-secondary/30 rounded-2xl border border-border flex items-center justify-between group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black">Two-Factor Authentication</h4>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                  </div>
                </div>
                <div className="h-6 w-11 bg-muted rounded-full relative cursor-pointer">
                  <div className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-all" />
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-2xl border border-border group hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <Key size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black">Change Password</h4>
                      <p className="text-xs text-muted-foreground">Update your login security credentials</p>
                    </div>
                  </div>
                  <button className="text-xs font-black text-primary hover:underline uppercase tracking-widest">Update</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-border shadow-soft p-8">
            <h3 className="text-xl font-black tracking-tight mb-6">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2">
                <div>
                  <h4 className="text-sm font-bold">Email Notifications</h4>
                  <p className="text-xs text-muted-foreground">Daily attendance reports and alerts</p>
                </div>
                <div className="h-6 w-11 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute top-1 right-1 h-4 w-4 bg-white rounded-full transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-between p-2">
                <div>
                  <h4 className="text-sm font-bold">DarkMode</h4>
                  <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <div className="h-6 w-11 bg-muted rounded-full relative cursor-pointer">
                  <div className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-all" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
