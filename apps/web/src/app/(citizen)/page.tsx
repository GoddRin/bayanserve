'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../providers';
import { useQuery } from '@tanstack/react-query';
import { getServiceTypes, getActiveLguConfig } from '../actions/citizen';
import { 
  FileCheck, 
  FileText, 
  Building2, 
  AlertTriangle, 
  Clock, 
  Coins, 
  ArrowRight, 
  Search, 
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function CitizenHomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [trackNumber, setTrackNumber] = useState('');

  // Fetch LGU configuration
  const { data: lgu } = useQuery({
    queryKey: ['lguConfig'],
    queryFn: () => getActiveLguConfig(),
  });

  // Fetch service types
  const { data: services, isLoading } = useQuery({
    queryKey: ['serviceTypes'],
    queryFn: () => getServiceTypes(),
  });

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackNumber.trim()) {
      router.push(`/track?number=${encodeURIComponent(trackNumber.trim())}`);
    }
  };

  // Helper to map category to icon & colors
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'CLEARANCE':
        return {
          icon: FileCheck,
          bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
      case 'CERTIFICATE':
        return {
          icon: FileText,
          bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'PERMIT':
        return {
          icon: Building2,
          bg: 'bg-amber-50 text-amber-600 border-amber-100',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'COMPLAINT':
        default:
        return {
          icon: AlertTriangle,
          bg: 'bg-rose-50 text-rose-600 border-rose-100',
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
        };
    }
  };

  return (
    <div className="flex flex-col">
      {/* ─── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-slate-50 to-slate-50 py-16 sm:py-24 border-b border-slate-100">
        <div className="absolute inset-y-0 right-0 -z-10 w-full max-w-2xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-70" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary animate-fade-in">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                {lgu?.name || 'BayanServe'}
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {t('heroTitle')}
              </h1>
              
              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                {t('heroSubtitle')}
              </p>

              {/* Quick Application Search / Tracking Widget */}
              <div className="pt-2 max-w-md">
                <form onSubmit={handleTrackSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder={t('trackPlaceholder')}
                      value={trackNumber}
                      onChange={(e) => setTrackNumber(e.target.value)}
                      className="pl-10 h-11 bg-white border-slate-200 focus-visible:ring-primary shadow-sm"
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-11 px-6 shadow-md hover:shadow">
                    {t('trackSearchBtn')}
                  </Button>
                </form>
                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <Info className="h-3 w-3 text-slate-400" />
                  {t('trackSub')}
                </p>
              </div>
            </div>

            {/* Right Hero Column: LGU Seal */}
            <div className="hidden lg:col-span-5 lg:flex justify-center items-center">
              <div className="relative flex h-80 w-80 items-center justify-center">
                {/* Decorative outer ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/15 animate-[spin_100s_linear_infinite]" />
                
                {/* Inner white card circle */}
                <div className="absolute inset-2 rounded-full bg-white shadow-xl border border-slate-100 overflow-hidden flex items-center justify-center">
                  {lgu?.logoUrl ? (
                    <img
                      src={lgu.logoUrl}
                      alt={`${lgu.name || 'LGU'} Official Seal`}
                      className="w-full h-full object-cover scale-[1.6] transition-transform hover:scale-[1.7] duration-500"
                    />
                  ) : (
                    /* Initials placeholder when no logo is available */
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                        <span className="text-4xl font-extrabold text-white tracking-wider select-none">
                          {(lgu?.name || 'LGU')
                            .split(/\s+/)
                            .filter((w: string) => w.length > 0)
                            .map((w: string) => w[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 3)}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-[180px] leading-tight">
                        {lgu?.municipality || 'Your Municipality'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── SERVICES GRID SECTION ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t('servicesTitle')}
            </h2>
            <p className="text-base sm:text-lg text-slate-500">
              {t('servicesSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {isLoading ? (
              // Display 6 Skeleton Cards
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="flex flex-col border border-slate-100 shadow-sm">
                  <CardHeader className="gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 py-4 flex-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full rounded-lg" />
                  </CardFooter>
                </Card>
              ))
            ) : services && services.length > 0 ? (
              services.map((svc) => {
                const theme = getCategoryTheme(svc.category);
                const CategoryIcon = theme.icon;
                const isFree = svc.baseFee === 0;

                return (
                  <Card key={svc.id} className="group flex flex-col border border-slate-200/80 hover:border-primary/30 bg-white hover:bg-slate-50/30 transition-all hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 duration-300">
                    <CardHeader className="relative pb-3 flex flex-row items-center gap-4">
                      {/* Icon */}
                      <div className={`flex h-11 w-11 items-center justify-center rounded-lg border shadow-sm transition-colors group-hover:bg-primary group-hover:text-white ${theme.bg}`}>
                        <CategoryIcon className="h-5.5 w-5.5" />
                      </div>
                      
                      {/* Name & Category Badge */}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-md sm:text-lg font-bold text-slate-800 tracking-tight leading-tight group-hover:text-primary transition-colors">
                          {svc.name}
                        </CardTitle>
                        <Badge variant="outline" className={`mt-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${theme.badge}`}>
                          {svc.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="py-4 text-xs text-slate-500 leading-relaxed flex-1 space-y-3">
                      {/* Quick Service Specs */}
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Coins className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('baseFee')}</span>
                            <span className="font-bold text-slate-700">
                              {isFree ? t('free') : `₱${svc.baseFee.toFixed(2)}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('processingTime')}</span>
                            <span className="font-bold text-slate-700">
                              {svc.processingDays} {svc.processingDays === 1 ? t('day') : t('days')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Required Docs Preview */}
                      {svc.requiredDocuments.length > 0 && (
                        <div className="pt-2 border-t border-slate-50">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                            {t('requirements')}
                          </span>
                          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-500 font-medium">
                            {svc.requiredDocuments.slice(0, 2).map((doc, idx) => (
                              <li key={idx} className="truncate">{doc}</li>
                            ))}
                            {svc.requiredDocuments.length > 2 && (
                              <li className="list-none text-slate-400 font-bold ml-[-4px] text-[10px]">
                                +{svc.requiredDocuments.length - 2} {t('more')}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-2 pb-5">
                      <Link href={`/apply/${svc.id}`} className="w-full">
                        <Button className="w-full flex items-center justify-center gap-2 group-hover:shadow shadow-sm font-semibold transition-all">
                          {t('applyNow')}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500 font-medium border border-dashed rounded-xl border-slate-200">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                {t('noServicesFound')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── INFO SECTION ────────────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                {t('homeStep1Title')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('homeStep1Desc')}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                {t('homeStep2Title')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('homeStep2Desc')}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                {t('homeStep3Title')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('homeStep3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
