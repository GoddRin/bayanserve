'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/app/providers';
import { FileText, CreditCard, BarChart3, Settings as SettingsIcon } from 'lucide-react';

interface AdminSidebarNavProps {
  userRole: string;
}

export default function AdminSidebarNav({ userRole }: AdminSidebarNavProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    {
      key: 'adminNavApplications',
      href: '/admin/applications',
      icon: FileText,
      allowedRoles: ['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'ADMIN'],
    },
    {
      key: 'adminNavPayments',
      href: '/admin/payments',
      icon: CreditCard,
      allowedRoles: ['TREASURER', 'ADMIN'],
    },
    {
      key: 'adminNavAnalytics',
      href: '/admin/analytics',
      icon: BarChart3,
      allowedRoles: ['MAYOR', 'TREASURER', 'ADMIN'],
    },
    {
      key: 'adminNavSettings',
      href: '/admin/settings',
      icon: SettingsIcon,
      allowedRoles: ['ADMIN'],
    },
  ];

  const filteredNavItems = navItems.filter(item => item.allowedRoles.includes(userRole));

  return (
    <nav className="flex-1 px-4 py-6 space-y-1">
      {filteredNavItems.map(item => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group ${
              isActive 
                ? 'bg-slate-800 text-white pl-5' 
                : 'text-slate-300 hover:bg-slate-850 hover:text-white hover:pl-5'
            }`}
          >
            <Icon 
              size={18} 
              className={`transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
              }`} 
            />
            <span>{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
