'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogIn,
  GraduationCap,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

import { loginUser } from '@/services/auth.service';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      await loginUser(email, password);

      router.push('/dashboard');
    } catch (err) {
      console.error(err);

      setError('Login failed! Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-[80vh] items-center justify-center -mt-16">
      <div className="half-moon-bg" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <GraduationCap size={40} className="text-primary" />
          </div>

          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Welcome Back
          </h1>

          <p className="text-center text-muted-foreground">
            Login to your school dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Error */}
          {error && (
            <div className="animate-in slide-in-from-top-2 flex items-center rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Email Address
            </label>

            <input
              type="email"
              placeholder="admin@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none text-foreground">
                Password
              </label>

              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none focus:underline"
              >
                Forgot Password?
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 pr-11 text-sm placeholder:text-muted-foreground transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={email}
      />
    </div>
  );
}
