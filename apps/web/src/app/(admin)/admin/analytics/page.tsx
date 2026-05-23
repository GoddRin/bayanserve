'use client';

import React, { useState, useEffect } from 'react';
import { getAnalyticsData } from '@/app/actions/admin';
import { BarChart3, TrendingUp, CreditCard, RefreshCw, AlertTriangle, Award } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/app/providers';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function AnalyticsPage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsData();
      setData(res);
    } catch (err: any) {
      console.error('Fetch analytics failed:', err);
      setError(err.message || t('adminDbErrorDesc'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (error) {
    return (
      <div className="py-12 max-w-3xl mx-auto">
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 p-6 rounded-xl flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <AlertTitle className="text-lg font-bold text-red-900 mb-2">{t('adminDbErrorTitle')}</AlertTitle>
            <AlertDescription className="text-sm font-semibold text-red-700 leading-relaxed">
              {error}
            </AlertDescription>
            <button 
              onClick={fetchAnalytics}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              {t('adminRetryBtn')}
            </button>
          </div>
        </Alert>
      </div>
    );
  }

  // Determine empty state based on actual indicators
  const isFreshDeployment = 
    !loading && 
    data && 
    (data.kpis.totalThisMonth === 0) &&
    (data.kpis.revenueCollected === 0) &&
    (data.barChartData.length === 0 || data.barChartData.every((st: any) => st.applications === 0));

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {process.env.NEXT_PUBLIC_DEFAULT_LGU_MUNICIPALITY ? `${process.env.NEXT_PUBLIC_DEFAULT_LGU_MUNICIPALITY} LGU — ` : ''}{t('adminAnalyticsTitle')}
          </h1>
          <p className="text-sm text-slate-500 font-medium">{t('adminAnalyticsSub')}</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t('adminRefresh')}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Submitted */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('adminKpiSubmitted')}</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight block">
              {loading ? '-' : (data?.kpis?.totalThisMonth || 0)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">{t('adminKpiSubmittedDesc')}</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <BarChart3 size={20} />
          </div>
        </div>

        {/* Total Approved / Released */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('adminKpiApproved')}</span>
            <span className="text-3xl font-black text-emerald-600 tracking-tight block">
              {loading ? '-' : (data?.kpis?.approvedCount || 0)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">{t('adminKpiApprovedDesc')}</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Award size={20} />
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('adminKpiPending')}</span>
            <span className="text-3xl font-black text-amber-500 tracking-tight block">
              {loading ? '-' : (data?.kpis?.pendingCount || 0)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">{t('adminKpiPendingDesc')}</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Collected revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('adminKpiRevenue')}</span>
            <span className="text-xl font-black text-slate-800 tracking-tight block truncate max-w-[140px]">
              {loading ? '-' : `₱${(data?.kpis?.revenueCollected || 0).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-US', { minimumFractionDigits: 2 })}`}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">{t('adminKpiRevenueDesc')}</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <CreditCard size={20} />
          </div>
        </div>

      </div>

      {/* ─── DETAILED VISUALS & CHARTS ────────────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <RefreshCw className="h-8 w-8 text-slate-300 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium font-sans">{t('adminLoadingAnalytics')}</p>
        </div>
      ) : isFreshDeployment ? (
        /* Empty state block (Requirement) */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <BarChart3 size={32} />
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">{t('adminNoAnalyticsTitle')}</h2>
          <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
            {t('adminNoAnalyticsDesc')}
          </p>
          <div className="pt-2">
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded-full uppercase">
              Fresh Deployment State
            </span>
          </div>
        </div>
      ) : (
        /* Visual analytics rendering with Recharts */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Applications count per service type */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{t('adminChartServicesTitle')}</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Bar Chart</span>
              </div>
              <div className="h-80 w-full pt-4">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.barChartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#64748b" 
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="applications" fill="#1a3c6e" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Submissions last 30 days */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{t('adminChartTrendTitle')}</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Line Chart</span>
              </div>
              <div className="h-80 w-full pt-4">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.lineChartData || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#64748b" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Table 1: Average Processing Time */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{t('adminPerfTitle')}</h3>
                <p className="text-xs text-slate-400 font-medium">{t('adminPerfSub')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase">
                      <th className="px-4 py-3">{t('adminAppService')}</th>
                      <th className="px-4 py-3 text-center">{t('adminColTotalProcessed')}</th>
                      <th className="px-4 py-3 text-right">{t('adminColAvgDays')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data?.avgProcessingTime?.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                          {t('adminPerfEmpty')}
                        </td>
                      </tr>
                    ) : (
                      data?.avgProcessingTime?.map((stat: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-800">{stat.serviceTypeName}</td>
                          <td className="px-4 py-3 text-center text-slate-500">{stat.count} {t('adminAppsUnit')}</td>
                          <td className="px-4 py-3 text-right text-slate-900 font-black">
                            <span className={`px-2 py-0.5 rounded ${stat.avgDays <= 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                              {stat.avgDays} {t('adminDaysUnit')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Barangay Rankings */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{t('adminBrgyTitle')}</h3>
                <p className="text-xs text-slate-400 font-medium">{t('adminBrgySub')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase">
                      <th className="px-4 py-3 w-12 text-center">Rank</th>
                      <th className="px-4 py-3">{t('barangay')}</th>
                      <th className="px-4 py-3 text-right">{t('adminColSubmissions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data?.barangayRanking?.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                          {t('adminBrgyEmpty')}
                        </td>
                      </tr>
                    ) : (
                      data?.barangayRanking?.map((brgy: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-center">
                            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black mx-auto ${idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800 capitalize">{brgy.barangayName.toLowerCase()}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            {brgy.submissions} {t('adminTransactionsUnit')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
