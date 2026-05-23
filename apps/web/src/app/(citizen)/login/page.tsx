'use client';

import { useState, useRef, useCallback, useEffect, useTransition } from 'react';
import { requestOTP, verifyOTP } from '@/app/actions/auth';
import Link from 'next/link';
import { useLanguage } from '../../providers';

type Step = 'identifier' | 'otp';

export default function CitizenLoginPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isVerifying, startVerifyTransition] = useTransition();

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Cooldown timer ---
  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // --- Step 1: Request OTP ---
  const handleRequestOTP = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await requestOTP(identifier);
      if (result.success) {
        setStep('otp');
        startCooldown();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(result.error ?? 'Failed to send OTP. Please try again.');
      }
    });
  };

  // --- Step 2: Verify OTP ---
  const submitOtp = useCallback(
    (digits: string[]) => {
      const code = digits.join('');
      if (code.length !== 6) return;
      setError('');
      startVerifyTransition(async () => {
        const result = await verifyOTP(identifier, code);
        if (result.success) {
          window.location.href = '/';
        } else {
          setError(result.error ?? 'Invalid code. Please try again.');
          setOtp(Array(6).fill(''));
          setTimeout(() => otpRefs.current[0]?.focus(), 50);
        }
      });
    },
    [identifier],
  );

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit when last digit entered
    if (digit && index === 5) {
      submitOtp(next);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) submitOtp(next);
  };

  const handleVerifySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitOtp(otp);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setError('');
    startTransition(async () => {
      const result = await requestOTP(identifier);
      if (result.success) {
        startCooldown();
      } else {
        setError(result.error ?? 'Failed to resend code.');
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* ─── Left Branding Panel ─── */}
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-8 py-16 lg:w-[45%] lg:py-0">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-amber-500/5 blur-3xl" />

        <div className="relative z-10 text-center">
          {/* Logo mark */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Bayan<span className="text-amber-400">Serve</span>
          </h1>
          <p className="mt-3 text-base text-slate-400 lg:text-lg">
            {t('tagline')}
          </p>

          <div className="mt-10 hidden flex-col gap-3 lg:flex">
            {[
              ['📋', t('pillDesc1')],
              ['📍', t('pillDesc2')],
              ['🔔', t('pillDesc3')],
            ].map(([icon, text]) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-5 py-3 backdrop-blur-sm"
              >
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          {/* Step Indicator */}
          <div className="mb-8 flex items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300 ${
                step === 'identifier'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              1
            </span>
            <div className={`h-0.5 w-8 rounded transition-colors duration-500 ${step === 'otp' ? 'bg-amber-500' : 'bg-slate-200'}`} />
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300 ${
                step === 'otp'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              2
            </span>
          </div>

          {/* ─── Card ─── */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
            {/* Gold accent bar */}
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />

            {/* Step 1 — Identifier */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                step === 'identifier'
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none absolute inset-0 -translate-x-8 opacity-0'
              }`}
            >
              <h2 className="text-2xl font-bold text-slate-900">
                {t('loginTitle').split('BayanServe')[0]}<span className="text-amber-600">BayanServe</span>{t('loginTitle').split('BayanServe')[1] || ''}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {t('loginSub')}
              </p>

              <form onSubmit={handleRequestOTP} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="identifier"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    {t('loginIdentifierLabel')}
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    placeholder={t('loginPlaceholder')}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {error && step === 'identifier' && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending || !identifier.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f172a] to-[#1e293b] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t('sending')}
                    </>
                  ) : (
                    t('sendOtpBtn')
                  )}
                </button>
              </form>
            </div>

            {/* Step 2 — OTP */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                step === 'otp'
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none absolute inset-0 translate-x-8 opacity-0'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setStep('identifier');
                  setOtp(Array(6).fill(''));
                  setError('');
                }}
                className="mb-4 flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                {t('back')}
              </button>

              <h2 className="text-2xl font-bold text-slate-900">
                {t('enterCode')}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {t('sentCodeTo')}{' '}
                <span className="font-medium text-slate-700">{identifier}</span>
              </p>

              <form onSubmit={handleVerifySubmit} className="mt-8 space-y-6">
                <div className="flex justify-center gap-2.5 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i]}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="h-14 w-11 rounded-xl border border-slate-300 bg-slate-50 text-center text-lg font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 sm:h-14 sm:w-12"
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

                {error && step === 'otp' && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || otp.join('').length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f172a] to-[#1e293b] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifying ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t('verifying')}
                    </>
                  ) : (
                    t('verifyBtn')
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isPending}
                    className="text-sm text-amber-600 transition-colors hover:text-amber-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {resendCooldown > 0
                      ? `${t('resendCodeIn')}${resendCooldown}s`
                      : t('resendCode')}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer link */}
          <p className="mt-8 text-center text-sm text-slate-500">
            {t('areYouStaff')}{' '}
            <Link
              href="/admin/login"
              className="font-medium text-amber-600 transition-colors hover:text-amber-700"
            >
              {t('signInHere')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
