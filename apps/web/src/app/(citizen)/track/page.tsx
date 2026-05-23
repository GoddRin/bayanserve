'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../providers';
import { useQuery } from '@tanstack/react-query';
import { trackApplication } from '../../actions/citizen';
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  FileSearch, 
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Timeline steps mapping
const STATUS_STEPS = [
  { status: 'SUBMITTED', key: 'SUBMITTED' },
  { status: 'PENDING_PAYMENT', key: 'PENDING_PAYMENT' },
  { status: 'UNDER_REVIEW', key: 'UNDER_REVIEW' },
  { status: 'APPROVED', key: 'APPROVED' },
  { status: 'RELEASED', key: 'RELEASED' }
];

function TrackContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackingParam = searchParams.get('number') || '';

  const [inputNumber, setInputNumber] = useState(trackingParam);

  // Sync search input with search parameters changes
  useEffect(() => {
    setInputNumber(trackingParam);
  }, [trackingParam]);

  // Query application details
  const { data: app, isLoading } = useQuery({
    queryKey: ['trackApp', trackingParam],
    queryFn: () => trackApplication(trackingParam),
    enabled: !!trackingParam,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputNumber.trim()) {
      router.push(`/track?number=${encodeURIComponent(inputNumber.trim())}`);
    } else {
      router.push('/track');
    }
  };

  const isFree = app?.baseFee === 0 || app?.serviceTypeName.toLowerCase().includes('complaint');

  const activeStatusSteps = isFree
    ? STATUS_STEPS.filter(step => step.status !== 'PENDING_PAYMENT')
    : STATUS_STEPS;

  // Helper to determine status order index
  const getStatusIndex = (currentStatus: string, stepsList: typeof STATUS_STEPS) => {
    if (currentStatus === 'REJECTED') return 3; // maps roughly to approved/rejected step
    return stepsList.findIndex(step => step.status === currentStatus);
  };

  const currentStepIndex = app ? getStatusIndex(app.status, activeStatusSteps) : -1;
  const isRejected = app?.status === 'REJECTED';

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ─── TITLE & SEARCH CARD ─────────────────────────────────────────────── */}
      <div className="text-center space-y-3 mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          {t('trackHeading')}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto">
          {t('trackHeadingDesc')}
        </p>
      </div>

      <Card className="border-slate-200/80 shadow-md mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder={t('trackPlaceholder')}
                value={inputNumber}
                onChange={(e) => setInputNumber(e.target.value)}
                className="pl-10 h-11 bg-white border-slate-200 focus-visible:ring-primary shadow-sm font-mono text-sm tracking-wider uppercase"
              />
            </div>
            <Button type="submit" size="lg" className="h-11 px-8 shadow-sm font-semibold">
              {t('trackSearchBtn')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── LOADING SKELETONS ────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="py-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="py-6">
              <div className="relative border-l-2 border-slate-100 pl-6 space-y-8 ml-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="relative space-y-2">
                    <Skeleton className="absolute -left-9.5 h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── ERROR STATE ──────────────────────────────────────────────────────── */}
      {trackingParam && !isLoading && !app && (
        <Alert variant="destructive" className="border-rose-200 bg-rose-50/50">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <AlertTitle className="font-bold text-rose-800">{t('notFound')}</AlertTitle>
          <AlertDescription className="text-rose-700 text-xs mt-1">
            {t('noRecord')}{t('verifyTrackingFormat')}
          </AlertDescription>
        </Alert>
      )}

      {/* ─── APPLICATION DETAILS & TIMELINE ────────────────────────────────────── */}
      {trackingParam && app && !isLoading && (
        <div className="space-y-6">
          
          {/* Main Info Box */}
          <Card className="border-slate-200/80 shadow-md">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t('trackingCode')}</span>
                <CardTitle className="text-lg font-mono font-bold text-slate-800 tracking-wider">
                  {app.trackingNumber}
                </CardTitle>
              </div>
              <div>
                <Badge className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  isRejected 
                    ? 'bg-rose-100 text-rose-800 hover:bg-rose-100 border border-rose-200' 
                    : 'bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20'
                }`}>
                  {t(app.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('docType')}</span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {app.serviceTypeName}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('applicantName')}</span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <User className="h-4 w-4 text-slate-400" />
                    {app.citizenName}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('submittedDate')}</span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {new Date(app.submittedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fil-PH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('estRelease')}</span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {(() => {
                      const date = new Date(app.submittedAt);
                      date.setDate(date.getDate() + app.processingDays);
                      return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fil-PH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Box */}
          <Card className="border-slate-200/80 shadow-md">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-md sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                {t('statusTimeline')}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-8">
              
              {/* Timeline Steps Display */}
              <div className="relative border-l-2 border-slate-200 pl-8 ml-3 space-y-8">
                {activeStatusSteps.map((step, idx) => {
                  const stepIndex = getStatusIndex(step.status, activeStatusSteps);
                  const isCompleted = currentStepIndex >= stepIndex && !isRejected;
                  const isActive = currentStepIndex === stepIndex && !isRejected;
                  const isUpcoming = currentStepIndex < stepIndex;

                  // Find history log matching this status transition
                  const historyLog = app.history.find((h: any) => h.newStatus === step.status);

                  return (
                    <div key={step.status} className="relative">
                      {/* Node Circle */}
                      <span className={`absolute -left-[41px] top-0 flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                        isCompleted 
                          ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' 
                          : isActive
                            ? 'bg-white border-primary text-primary ring-4 ring-primary/10 animate-pulse'
                            : 'bg-white border-slate-200 text-slate-300'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        )}
                      </span>

                      {/* Content */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm sm:text-md font-bold tracking-tight ${
                            isActive 
                              ? 'text-primary' 
                              : isCompleted 
                                ? 'text-slate-800' 
                                : 'text-slate-400'
                          }`}>
                            {t(step.key)}
                          </h3>
                          {isActive && (
                            <Badge className="bg-primary/10 text-primary border-none text-[9px] uppercase px-1.5 py-0.5 rounded font-bold animate-pulse">
                              {t('activeBadge')}
                            </Badge>
                          )}
                        </div>

                        {/* History Log Remarks & Timing */}
                        {historyLog && (
                          <div className="space-y-1 text-xs">
                            <p className="text-slate-500 font-medium">
                              {historyLog.remarks || t('stepCompleted')}
                            </p>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {new Date(historyLog.changedAt).toLocaleString(language === 'en' ? 'en-US' : 'fil-PH', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })} • {historyLog.changedByUserName}
                            </span>
                          </div>
                        )}

                        {isUpcoming && (
                          <p className="text-xs text-slate-300 font-medium italic">
                            {t('awaitingPrevStep')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Handling Rejection Step in Timeline */}
                {isRejected && (
                  <div className="relative">
                    <span className="absolute -left-[41px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 border border-rose-600 text-white shadow-md shadow-rose-200">
                      <XCircle className="h-4 w-4" />
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-md font-bold tracking-tight text-rose-600">
                          {t('REJECTED')}
                        </h3>
                        <Badge className="bg-rose-100 text-rose-800 border-none text-[9px] uppercase px-1.5 py-0.5 rounded font-bold">
                          {t('finalBadge')}
                        </Badge>
                      </div>
                      
                      {(() => {
                        const rejectLog = app.history.find((h: any) => h.newStatus === 'REJECTED');
                        return rejectLog ? (
                          <div className="space-y-1 text-xs">
                            <p className="text-rose-700 font-semibold bg-rose-50 border border-rose-100 p-2.5 rounded-lg max-w-lg leading-relaxed">
                              {t('remarks')}: {rejectLog.remarks}
                            </p>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {new Date(rejectLog.changedAt).toLocaleString(language === 'en' ? 'en-US' : 'fil-PH', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })} • {rejectLog.changedByUserName}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── NO SEARCH YET PLACEHOLDER ───────────────────────────────────────── */}
      {!trackingParam && (
        <div className="text-center py-16 text-slate-400 bg-white border border-dashed rounded-xl border-slate-200">
          <FileSearch className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-600 mb-1">
            {t('readyToTrack')}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {t('readyToTrackDesc')}
          </p>
        </div>
      )}

    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <Skeleton className="h-8 w-48 mx-auto mb-4" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}
