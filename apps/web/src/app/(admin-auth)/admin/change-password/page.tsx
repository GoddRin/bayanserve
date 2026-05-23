'use client';

import { useState, useTransition, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { changeStaffPassword } from '@/app/actions/admin';
import Link from 'next/link';

function ChangePasswordForm() {
  const { data: session, update: updateSession } = useSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isMustChange = session?.user?.mustChangePassword ?? false;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    startTransition(async () => {
      try {
        await changeStaffPassword({
          currentPassword,
          newPassword,
        });

        setSuccess(true);

        // Update the session so mustChangePassword is cleared
        await updateSession();

        // Redirect to admin dashboard after short delay
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'Failed to change password. Please try again.');
      }
    });
  };

  // Password strength indicators
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthLabels = ['', 'Mahina (Weak)', 'Katamtaman (Fair)', 'Malakas (Good)', 'Napakalakas (Strong)', 'Napakalakas (Excellent)'];
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f172a] px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-amber-500/[0.04] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-blue-500/[0.04] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isMustChange ? 'Set Your New Password' : 'Change Password'}
          </h1>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600" />

          {isMustChange && (
            <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <p className="text-sm text-amber-400 font-medium">
                ⚠️ You must change your temporary password before accessing the admin portal.
              </p>
            </div>
          )}

          {!isMustChange && (
            <p className="mt-4 text-sm text-slate-400">
              Update your staff portal credentials
            </p>
          )}
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          {/* Philippine flag tri-color bar */}
          <div className="absolute left-0 top-0 flex h-1 w-full">
            <div className="h-full w-1/3 bg-[#0038A8]" />
            <div className="h-full w-1/3 bg-[#CE1126]" />
            <div className="h-full w-1/3 bg-[#FCD116]" />
          </div>

          {success ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Password Updated!</h3>
              <p className="text-sm text-slate-400">
                Matagumpay na nabago ang iyong password. Redirecting to dashboard...
              </p>
              <div className="h-1 w-24 mx-auto rounded-full bg-emerald-500/30 overflow-hidden">
                <div className="h-full bg-emerald-500 animate-pulse rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Current Password */}
              <div>
                <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-slate-300">
                  {isMustChange ? 'Temporary Password' : 'Current Password'}
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-amber-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {showCurrent ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-slate-300">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-amber-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {showNew ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>

                {/* Password strength meter */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            strength >= level ? strengthColors[strength] : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-[10px] font-semibold ${
                      strength <= 1 ? 'text-red-400' :
                      strength <= 2 ? 'text-orange-400' :
                      strength <= 3 ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {strengthLabels[strength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`w-full rounded-xl border bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:bg-white/[0.08] focus:ring-2 ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                      : confirmPassword && confirmPassword === newPassword
                      ? 'border-emerald-500/50 focus:border-emerald-500/50 focus:ring-emerald-500/20'
                      : 'border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20'
                  }`}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="mt-1.5 text-[11px] text-red-400 font-medium">Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="mt-1.5 text-[11px] text-emerald-400 font-medium">✓ Passwords match</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all duration-200 hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating password…
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isMustChange && (
          <p className="mt-8 text-center text-sm text-slate-500">
            <Link
              href="/admin"
              className="font-medium text-amber-500 transition-colors hover:text-amber-400"
            >
              ← Back to Dashboard
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <ChangePasswordForm />
    </Suspense>
  );
}
