'use client';

import React, { useState, useEffect } from 'react';
import { getAdminApplications, bulkMarkApplicationsAsReviewed } from '@/app/actions/admin';
import { FileText, Search, Eye, RefreshCw, X, AlertTriangle, Calendar } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { useLanguage } from '@/app/providers';

// Status styling map
const statusBadges: Record<string, { label: string; style: string }> = {
  SUBMITTED: { label: 'Submitted', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  UNDER_REVIEW: { label: 'Under Review', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING_PAYMENT: { label: 'Pending Payment', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  APPROVED: { label: 'Approved', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', style: 'bg-slate-100 text-slate-600 border-slate-200' },
  RELEASED: { label: 'Released', style: 'bg-violet-50 text-violet-700 border-violet-200' },
};

export default function ApplicationsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk actions and row selections
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch applications
  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminApplications({
        search: search || undefined,
        status: status || undefined,
        serviceTypeId: serviceTypeId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Fetch applications failed:', err);
      setError(err.message || 'Hindi ma-access ang database. Makipag-ugnayan sa inyong IT administrator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [status, serviceTypeId, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  // Row selection toggle
  const toggleRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!data?.applications) return;
    if (selectedIds.length === data.applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.applications.map((app: any) => app.id));
    }
  };

  // Bulk mutations
  const handleBulkMarkAsReviewed = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      await bulkMarkApplicationsAsReviewed(selectedIds);
      setSelectedIds([]);
      fetchApplications();
    } catch (err: any) {
      alert(err.message || 'Nabigong markahan bilang sinusuri.');
    } finally {
      setActionLoading(false);
    }
  };

  if (error) {
    return (
      <div className="py-12 max-w-3xl mx-auto">
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 p-6 rounded-xl flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <AlertTitle className="text-lg font-bold text-red-900 mb-2">{t('adminDbErrorTitle')}</AlertTitle>
            <AlertDescription className="text-sm font-semibold text-red-700 leading-relaxed">
              {t('adminDbErrorDesc')}
            </AlertDescription>
            <button 
              onClick={fetchApplications}
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
      
      {/* Page Title header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('adminAppsTitle')}</h1>
          <p className="text-sm text-slate-500 font-medium">{t('adminAppsSub')}</p>
        </div>
        <button 
          onClick={fetchApplications}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t('adminRefresh')}</span>
        </button>
      </div>

      {/* ─── FILTERS PANEL ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Search by tracking number / name */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('adminSearchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            >
              <option value="">{t('adminAllStatus')}</option>
              <option value="SUBMITTED">{t('SUBMITTED')}</option>
              <option value="UNDER_REVIEW">{t('UNDER_REVIEW')}</option>
              <option value="PENDING_PAYMENT">{t('PENDING_PAYMENT')}</option>
              <option value="APPROVED">{t('APPROVED')}</option>
              <option value="REJECTED">{t('REJECTED')}</option>
              <option value="RELEASED">{t('RELEASED')}</option>
            </select>
          </div>

          {/* Filter Service Type */}
          <div>
            <select
              value={serviceTypeId}
              onChange={e => setServiceTypeId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            >
              <option value="">{t('adminAllServices')}</option>
              {data?.serviceTypes?.map((svc: any) => (
                <option key={svc.id} value={svc.id}>{svc.name}</option>
              ))}
            </select>
          </div>

          {/* Date range filters */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar size={14} />
              <span>{t('adminDateRangeLabel')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
              />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </form>
      </div>

      {/* ─── BULK ACTIONS BAR (Shows when rows are selected) ──────────────────── */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg animate-fade-in border border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-white text-slate-900 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </div>
            <span className="text-xs sm:text-sm font-semibold">{t('adminSelectedApps')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Assign to Officer dropdown removed */}

            {/* Bulk Reviewed status */}
            <button
              onClick={handleBulkMarkAsReviewed}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all"
            >
              {t('adminMarkReviewedBtn')}
            </button>

            {/* Cancel selections */}
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── DATA TABLE ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="h-8 w-8 text-slate-300 animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-medium">{t('adminLoadingData')}</p>
          </div>
        ) : !data?.applications || data.applications.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileText className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">{t('adminNoAppsTitle')}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">{t('adminNoAppsDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-500 uppercase select-none">
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === data.applications.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="px-6 py-4">{t('adminColTrackingNumber')}</th>
                  <th className="px-6 py-4">{t('adminColCitizen')}</th>
                  <th className="px-6 py-4">{t('adminColServiceType')}</th>
                  <th className="px-6 py-4">{t('adminColSubmittedDate')}</th>
                  <th className="px-6 py-4 text-center">{t('adminColStatus')}</th>
                  <th className="px-6 py-4 text-right">{t('adminColActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {data.applications.map((app: any) => {
                  const isChecked = selectedIds.includes(app.id);
                  const badge = statusBadges[app.status] || { label: app.status, style: 'bg-slate-100 text-slate-700' };

                  return (
                    <tr 
                      key={app.id}
                      className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-slate-50/40' : ''}`}
                    >
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRow(app.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 tracking-tight">
                        {app.trackingNumber}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {app.applicantName}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {app.serviceTypeName}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(app.submittedAt).toLocaleDateString(t('languageLabel') === 'Filipino' ? 'en-US' : 'fil-PH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 border rounded-full ${badge.style}`}>
                          {t(app.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <Eye size={12} />
                          <span>{t('adminOpenBtn')}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
