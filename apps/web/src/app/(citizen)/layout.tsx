'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useLanguage } from '../providers';
import { useQuery } from '@tanstack/react-query';
import { getActiveLguConfig } from '../actions/citizen';
import { FileText, Search, LayoutDashboard, LogIn, LogOut, Globe, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function formatName(name: string | null | undefined): string {
  if (!name) return 'Citizen';
  const base = name.includes('@') ? name.split('@')[0] : name;
  const spaced = base.replace(/[._-]/g, ' ');
  return spaced
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getInitials(name: string | null | undefined): string {
  const formatted = formatName(name);
  const parts = formatted.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? 'C').toUpperCase();
}

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { language, setLanguage, t } = useLanguage();

  // Redirect staff/admin users away from citizen UI to the admin dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role && session.user.role !== 'CITIZEN') {
      router.replace('/admin');
    }
  }, [status, session, router]);

  // Fetch LGU configuration dynamically using React Query
  const { data: lgu, isLoading } = useQuery({
    queryKey: ['lguConfig'],
    queryFn: () => getActiveLguConfig(),
  });

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fil' : 'en');
  };

  const navLinks = [
    { href: '/', label: t('home'), icon: FileText },
    { href: '/track', label: t('track'), icon: Search },
    ...(session ? [{ href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 leading-none group-hover:text-primary transition-colors">
                  BayanServe
                </span>
                {isLoading ? (
                  <Skeleton className="h-3 w-24 mt-1" />
                ) : (
                  <span className="text-xs font-medium text-slate-500">
                    {lgu?.name}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <Globe className="h-4 w-4" />
              <span className="font-semibold text-xs">{t('languageLabel')}</span>
            </Button>

            {/* User Auth Buttons */}
            {status === 'loading' ? (
              <Skeleton className="h-9 w-24 rounded-lg" />
            ) : session ? (
              <div className="flex items-center gap-4 pl-3 border-l border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-md shadow-primary/10">
                    {getInitials(session.user.name || session.user.email)}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none mb-1">
                      {t('welcomePrefix')}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 leading-none">
                      {formatName(session.user.name || session.user.email)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs font-semibold">{t('logout')}</span>
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" className="flex items-center gap-1.5 font-medium shadow-sm hover:shadow">
                  <LogIn className="h-4 w-4" />
                  <span>{t('login')}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation bar (under header for small viewports) */}
      <div className="flex md:hidden border-b border-slate-200 bg-white px-4 py-2 gap-2 overflow-x-auto scrollbar-none">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="text-md font-bold tracking-tight text-slate-900">
                  BayanServe
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                {t('footerDesc')}
              </p>
            </div>
            
            <div className="text-left md:text-right space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('footerContact')}
              </h4>
              {isLoading ? (
                <div className="space-y-1">
                  <Skeleton className="h-3 w-48 ml-auto" />
                  <Skeleton className="h-3 w-36 ml-auto" />
                </div>
              ) : (
                <div className="text-xs text-slate-600 space-y-1">
                  <p>Centro, {lgu?.municipality}, {lgu?.province} 3502</p>
                  <p>Email: <a href={`mailto:${lgu?.contactEmail}`} className="text-primary hover:underline">{lgu?.contactEmail}</a></p>
                  <p>Tel: {lgu?.contactPhone}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} BayanServe. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/admin/login" className="hover:text-primary transition-colors font-medium">
                {t('adminLogin')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
