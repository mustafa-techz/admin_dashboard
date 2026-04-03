'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, GraduationCap } from 'lucide-react';
import { loginUser } from '@/services/auth.service';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginUser(email, password);
      console.log("result", result);
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Login failed! Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[80vh] items-center justify-center -mt-16">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-soft border border-border">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <GraduationCap size={40} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-center">Login to your school dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Email Address
            </label>
            <input
              type="email"
              placeholder="admin@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-primary/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-primary/50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center w-full h-11 px-4 py-2 font-medium transition-colors rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <LogIn size={18} className="mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Note:</p>
          <div className="text-xs text-muted-foreground">
            Use your Firebase credentials to log in.
          </div>
        </div>
      </div>
    </div>
  );
}
