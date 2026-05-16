import React, { useState } from 'react';
import { X, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '@/services/auth.service';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({ isOpen, onClose, defaultEmail = '' }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      // Don't expose whether the user exists or not for security reasons
      // Just show a generic error if it's not a clear client-side issue,
      // or handle specific safe-to-show Firebase errors
      if (err.code === 'auth/invalid-email') {
        setError('The email address is invalid.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        // Fallback for user-not-found or other errors (security measure)
        // Actually, to be perfectly secure and not reveal user existence:
        // "If an account exists with this email, a password reset link has been sent."
        // We'll show success anyway to prevent email enumeration, OR we can show 
        // standard Firebase errors if that's the preferred approach.
        // The requirements say: "Do NOT reveal whether email exists or not unnecessarily"
        setSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[95vw] sm:max-w-md p-6 bg-card rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mb-1">Reset Password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your registered email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-green-600 dark:text-green-400 leading-relaxed">
                If an account exists with this email, a password reset link has been sent. Please check your inbox.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full h-11 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shadow-lg shadow-primary/20"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reset-email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className={`flex h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
                  error ? 'border-destructive focus-visible:ring-destructive/50' : 'border-border hover:border-primary/50'
                }`}
                disabled={isLoading}
                required
              />
              {error && (
                <div className="flex items-center text-sm text-destructive mt-1.5 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
