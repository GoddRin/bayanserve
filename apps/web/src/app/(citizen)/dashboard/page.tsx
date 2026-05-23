'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLanguage } from '../../providers';
import { useQuery } from '@tanstack/react-query';
import { getCitizenApplications } from '../../actions/citizen';
import { 
  Inbox, 
  Plus, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Calendar,
  LogIn,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function CitizenDashboardPage() {
  const { t, language } = useLanguage();
  const { data: session, status } = useSession();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ['citizenApps'],
    queryFn: () => getCitizenApplications(),
    enabled: !!session,
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (currentStatus: string) => {
    switch (currentStatus) {
      case 'RELEASED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'APPROVED':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PENDING_PAYMENT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'SUBMITTED':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // ─── CASE A: NOT LOGGED IN ─────────────────────────────────────────────────
  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Card className="border-slate-200/80 shadow-md">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <LogIn className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">
                {t('signInRequired')}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                {t('signInRequiredDesc')}
              </p>
            </div>
            <Link href="/login" className="block w-full">
              <Button className="w-full font-semibold shadow-sm">
                {t('login')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header and apply quick link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('dashboardHeading')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('dashboardSub')}
          </p>
        </div>
        <Link href="/">
          <Button className="flex items-center gap-1.5 shadow-sm font-semibold">
            <Plus className="h-4.5 w-4.5" />
            <span>{t('newApplication')}</span>
          </Button>
        </Link>
      </div>

      {/* ─── LOADING SKELETONS ────────────────────────────────────────────────── */}
      {(isLoading || status === 'loading') ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="border-slate-100 shadow-sm">
              <CardContent className="p-6 flex items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : applications && applications.length > 0 ? (
        
        // ─── LIST OF APPLICATIONS ──────────────────────────────────────────────
        <div className="space-y-4">
          {applications.map((app: any) => {
            const dateStr = new Date(app.submittedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fil-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <Card key={app.id} className="border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left Column: Doc Type and Submitted Date */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-md sm:text-lg font-bold text-slate-800 tracking-tight leading-tight">
                        {app.serviceTypeName}
                      </h3>
                      <Badge className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusColor(app.status)}`}>
                        {t(app.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] font-bold text-slate-600">
                        {app.trackingNumber}
                        <button 
                          onClick={() => handleCopy(app.trackingNumber, app.id)}
                          className="hover:text-primary p-0.5 rounded transition-colors"
                          title="Copy tracking number"
                        >
                          {copiedId === app.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-2 md:self-center">
                    
                    {/* View Details/Track Button */}
                    <Link href={`/track?number=${app.trackingNumber}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">
                        <Eye className="h-4 w-4" />
                        <span>{t('trackBtnText')}</span>
                      </Button>
                    </Link>

                    {/* If document is released, offer download & verify links */}
                    {app.status === 'RELEASED' && app.issuedDocumentUrl && (
                      <a href={app.issuedDocumentUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="flex items-center gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm text-white">
                          <Download className="h-4 w-4" />
                          <span>{t('downloadDoc')}</span>
                        </Button>
                      </a>
                    )}

                    {app.status === 'RELEASED' && app.issuedDocumentQr && (
                      <Link href={`/verify/${app.issuedDocumentQr}`}>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs">
                          <ExternalLink className="h-3 w-3" />
                          <span>{t('verifyQr')}</span>
                        </Button>
                      </Link>
                    )}

                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        
        // ─── EMPTY STATE ──────────────────────────────────────────────────────
        <div className="text-center py-16 text-slate-400 bg-white border border-dashed rounded-xl border-slate-200">
          <Inbox className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-600 mb-1">
            {t('noApps')}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-4">
            {t('noAppsDesc')}
          </p>
          <Link href="/">
            <Button size="sm" className="font-semibold shadow-sm">
              {t('applyNow')}
            </Button>
          </Link>
        </div>
      )}

    </div>
  );
}
