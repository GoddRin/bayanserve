'use client';

import React, { useState, useEffect } from 'react';
import { getPaymentsData } from '@/app/actions/admin';
import { CreditCard, Search, Calendar, Download, RefreshCw, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/app/providers';

export default function PaymentsPage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPaymentsData({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Fetch payments failed:', err);
      setError(err.message || t('adminDbErrorDesc'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    if (!filteredPayments || filteredPayments.length === 0) return;

    const headers = [
      t('adminColOrNumber'),
      t('adminColTrackingNumber'),
      t('adminColCitizen'),
      t('adminColServiceType'),
      t('adminColAmount'),
      t('adminColDatePaid'),
      t('adminColRecordedBy')
    ];

    const rows = filteredPayments.map((p: any) => [
      p.orNumber,
      p.trackingNumber,
      p.applicantName,
      p.serviceTypeName,
      p.amount.toFixed(2),
      new Date(p.datePaid).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-US'),
      p.recordedBy
    ]);

    // Construct CSV String with proper escaping
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const escaped = row.map((val: any) => {
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      });
      csvRows.push(escaped.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BayanServe_Payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side search filtering on loaded data
  const filteredPayments = data?.payments?.filter((p: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.orNumber.toLowerCase().includes(term) ||
      p.trackingNumber.toLowerCase().includes(term) ||
      p.applicantName.toLowerCase().includes(term) ||
      p.serviceTypeName.toLowerCase().includes(term)
    );
  }) || [];

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
              onClick={fetchPayments}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              {t('adminRetryBtn')}
            </button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('adminPaymentsTitle')}</h1>
          <p className="text-sm text-slate-500 font-medium">{t('adminPaymentsSub')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchPayments}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{t('adminRefresh')}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={loading || filteredPayments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            <span>{t('adminExportCsvBtn')}</span>
          </button>
        </div>
      </div>

      {/* Revenue Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-850 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <CreditCard size={180} />
          </div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-semibold tracking-wider uppercase">{t('adminTotalRevenue')}</p>
              <h2 className="text-3xl font-black tracking-tight text-white">
                ₱{(data?.totalRevenue || 0).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-US', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 text-emerald-400">
              ₱
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center text-xs text-slate-200">
            <span className="font-medium">{t('adminCashOnly')}</span>
            <span className="text-emerald-400 font-bold">{t('adminActiveState')}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t('adminPaidCount')}</p>
              <h3 className="text-2xl font-black text-slate-800">{filteredPayments.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet size={18} />
            </div>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {t('adminFilteredCount')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t('adminMethod')}</p>
              <h3 className="text-xl font-bold text-slate-800">{t('adminOfficePayment')}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="text-xs text-slate-400 font-medium flex justify-between items-center">
            <span>{t('adminOnlinePayments')}:</span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">{t('comingSoon')}</span>
          </div>
        </div>
      </div>

      {/* ─── FILTERS PANEL ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Client-side search filter */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('adminPaymentsSearchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Date range filters */}
          <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Calendar size={14} />
              <span>{t('adminPaymentDateRangeLabel')}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
              />
              <span className="text-slate-400 text-xs">{t('adminTo')}</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── DATA TABLE ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="h-8 w-8 text-slate-300 animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-medium">{t('adminLoadingPayments')}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <CreditCard className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">{t('adminNoPaymentsTitle')}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">{t('adminNoPaymentsDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-500 uppercase select-none">
                  <th className="px-6 py-4">{t('adminColOrNumber')}</th>
                  <th className="px-6 py-4">{t('adminColTrackingNumber')}</th>
                  <th className="px-6 py-4">{t('adminColCitizen')}</th>
                  <th className="px-6 py-4">{t('adminColServiceType')}</th>
                  <th className="px-6 py-4">{t('adminColDatePaid')}</th>
                  <th className="px-6 py-4">{t('adminColRecordedBy')}</th>
                  <th className="px-6 py-4 text-right">{t('adminColAmount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {p.orNumber}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">
                      {p.trackingNumber}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {p.applicantName}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {p.serviceTypeName}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(p.datePaid).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      {p.recordedBy}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                      ₱{p.amount.toLocaleString(language === 'fil' ? 'fil-PH' : 'en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
