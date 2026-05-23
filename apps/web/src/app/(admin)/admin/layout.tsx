import React from 'react';
import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@bayanserve/db';
import { 
  LogOut, 
  Menu, 
  Building,
  User as UserIcon
} from 'lucide-react';
import AdminSidebarNav from '@/components/AdminSidebarNav';
import { AdminLanguageToggle } from '@/components/AdminLanguageToggle';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: LayoutProps) {
  const session = await auth();

  // Enforce staff session restrictions — CITIZEN must NEVER access /admin
  if (!session || !session.user) {
    redirect('/admin/login');
  }

  // Explicit block: citizen sessions must never access admin routes
  if (session.user.role === 'CITIZEN') {
    redirect('/admin/login');
  }

  const user = session.user;
  const userRole = user.role;

  // Query database for LGU details to apply white-label values and colors
  let lguName = process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME ?? 'BayanServe';
  let logoUrl = process.env.NEXT_PUBLIC_DEFAULT_LGU_LOGO_URL || null;

  try {
    if (user.lguId) {
      const lgu = await prisma.lgu.findUnique({
        where: { id: user.lguId }
      });
      if (lgu) {
        lguName = lgu.name;
        logoUrl = lgu.logoUrl || logoUrl;
      }
    }
  } catch (err) {
    console.error('Error fetching LGU settings in Admin Layout:', err);
    // Ignore database failures during build or when offline - gracefully keep fallbacks
  }

  // Visual badges per user role
  const roleBadges: Record<string, { label: string; style: string }> = {
    ADMIN: { label: 'Admin', style: 'bg-violet-100 text-violet-700 border-violet-200' },
    MAYOR: { label: 'Mayor', style: 'bg-amber-100 text-amber-700 border-amber-200' },
    TREASURER: { label: 'Treasurer', style: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    DEPARTMENT_OFFICER: { label: 'Officer', style: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    BARANGAY_CLERK: { label: 'Clerk', style: 'bg-blue-100 text-blue-700 border-blue-200' },
  };

  const badgeConfig = roleBadges[userRole] || { label: userRole, style: 'bg-slate-100 text-slate-700 border-slate-200' };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* ─── SIDEBAR NAVIGATION (Desktop) ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 select-none">
        
        {/* LGU Profile Title & Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-900/50 ring-1 ring-white/10">
            <Building size={22} className="text-white drop-shadow-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm text-white tracking-wide leading-tight">{lguName}</h2>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">BayanServe Admin Portal</p>
          </div>
        </div>

        {/* Dynamic Nav Links */}
        <AdminSidebarNav userRole={userRole} />

        {/* Admin Branding footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>🏛️ BayanServe v1.0</span>
          <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">LGU</span>
        </div>
      </aside>

      {/* ─── MAIN PORT ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* ─── TOP BAR ─────────────────────────────────────────────────────────── */}
        <header className="flex h-16 items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
          
          {/* Menu button for mobile */}
          <div className="flex items-center gap-3 md:hidden">
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm ring-1 ring-black/5">
                <Building size={16} className="text-white" />
              </div>
              <span className="font-bold text-xs text-slate-800 truncate max-w-[150px]">{lguName}</span>
            </div>
          </div>

          {/* Breadcrumb section */}
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-800 font-bold capitalize">Dashboard</span>
          </div>

          {/* Logged in Staff details + logout */}
          <div className="flex items-center gap-4">
            <AdminLanguageToggle />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{user.email}</p>
              </div>
              
              {/* Role badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${badgeConfig.style}`}>
                {badgeConfig.label}
              </span>

              {/* Avatar placeholder */}
              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 shadow-inner">
                <UserIcon size={16} />
              </div>
            </div>

            {/* Logout button */}
            <form action={async () => {
              'use server';
              await signOut({ redirectTo: '/admin/login' });
            }} className="border-l border-slate-200 pl-3">
              <button 
                type="submit"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Mag-logout"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </header>

        {/* ─── DASHBOARD PAGE CONTENT ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
