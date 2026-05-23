'use client';

import { useState, useTransition, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AdminLoginForm() {
  const lguName = process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'BayanServe';

  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') ?? '/admin';
  const roleParam = searchParams.get('role');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      try {
        const result = await signIn('staff-credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid email or password, or your account has been deactivated. Please try again.');
        } else if (result?.ok) {
          // Fetch the fresh session to check mustChangePassword
          const session = await getSession();
          if (session?.user?.mustChangePassword) {
            window.location.href = '/admin/change-password';
          } else {
            const target = roleParam ? `/admin?role=${roleParam}` : redirectPath;
            window.location.href = target;
          }
        } else {
          setError('Invalid email or password, or your account has been deactivated. Please try again.');
        }
      } catch (err: any) {
        console.error('Sign-in client error:', err);
        setError('Invalid email or password, or your account has been deactivated. Please try again.');
      }
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f172a] px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-amber-500/[0.04] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-blue-500/[0.04] blur-3xl" />
        {/* Grid pattern */}
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
        {/* Logo / Heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {lguName}
          </h1>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600" />
          <p className="mt-4 text-sm font-medium text-amber-400">
            BayanServe Staff Portal
          </p>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          {/* Philippine flag tri-color bar */}
          <div className="absolute left-0 top-0 flex h-1 w-full">
            <div className="h-full w-1/3 bg-[#0038A8]" />
            <div className="h-full w-1/3 bg-[#CE1126]" />
            <div className="h-full w-1/3 bg-[#FCD116]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="staff@lgu.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-amber-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-amber-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
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
              disabled={isPending || !email.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all duration-200 hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500">
          Are you a citizen?{' '}
          <Link
            href="/login"
            className="font-medium text-amber-500 transition-colors hover:text-amber-400"
          >
            Access services here →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
