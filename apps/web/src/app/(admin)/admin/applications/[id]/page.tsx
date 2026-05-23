'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  getApplicationDetails, 
  updateApplicationStatus, 
  recordCashPayment, 
  issueDocument 
} from '@/app/actions/admin';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  CreditCard, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ShieldCheck,
  Send,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/app/providers';

const statusBadges: Record<string, { label: string; style: string }> = {
  SUBMITTED: { label: 'Submitted', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  UNDER_REVIEW: { label: 'Under Review', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING_PAYMENT: { label: 'Pending Payment', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  APPROVED: { label: 'Approved', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', style: 'bg-slate-100 text-slate-600 border-slate-200' },
  RELEASED: { label: 'Released', style: 'bg-violet-50 text-violet-700 border-violet-200' },
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const { t, language } = useLanguage();
  
  const id = params?.id as string;
  const userRole = session?.user?.role || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status mutation states
  const [nextStatus, setNextStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Treasurer Cash payment states
  const [orNumber, setOrNumber] = useState('');
  const [amount, setAmount] = useState(0);
  const [datePaid, setDatePaid] = useState(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Document issuance states
  const [issuingLoading, setIssuingLoading] = useState(false);

  // Previews, Lightbox & Error states
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageRetries, setImageRetries] = useState<Record<string, number>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const lightboxRef = React.useRef<HTMLDivElement>(null);

  // Helper for safe URL encoding
  const getSafeUrl = (url: string) => {
    if (!url) return '';
    try {
      return encodeURI(decodeURI(url));
    } catch (e) {
      return url;
    }
  };

  // Image retry handler for propagation delays
  const handleImageError = (reqDocName: string) => {
    const current = imageRetries[reqDocName] || 0;
    if (current < 5) {
      setTimeout(() => {
        setImageRetries(prev => ({
          ...prev,
          [reqDocName]: (prev[reqDocName] || 0) + 1
        }));
      }, 500 * (current + 1));
    } else {
      setImageErrors(prev => ({
        ...prev,
        [reqDocName]: true
      }));
    }
  };

  // Get image src with retry cache-buster query param
  const getImageSrc = (reqDocName: string, baseUrl: string) => {
    const retries = imageRetries[reqDocName] || 0;
    const safeUrl = getSafeUrl(baseUrl);
    if (retries > 0) {
      const separator = safeUrl.includes('?') ? '&' : '?';
      return `${safeUrl}${separator}r=${retries}`;
    }
    return safeUrl;
  };

  // Lightbox handlers
  const openLightbox = (url: string, title: string) => {
    setImageErrors(prev => ({ ...prev, [title]: false }));
    setImageRetries(prev => ({ ...prev, [title]: 0 }));
    setPreviewImage({ url, title });
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const closeLightbox = () => {
    setPreviewImage(null);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoomScale > 1) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomScale(2);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomScale <= 1) return;
    e.preventDefault();
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const element = lightboxRef.current;
    if (!element) return;

    const onWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.15;
      setZoomScale(prev => {
        const nextScale = e.deltaY < 0 
          ? Math.min(prev + zoomIntensity, 3) 
          : Math.max(prev - zoomIntensity, 0.5);
        if (nextScale <= 1) {
          setPanOffset({ x: 0, y: 0 });
        }
        return nextScale;
      });
    };

    element.addEventListener('wheel', onWheelEvent, { passive: false });
    return () => {
      element.removeEventListener('wheel', onWheelEvent);
    };
  }, [previewImage]);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getApplicationDetails(id);
      setData(res.application);
      setNextStatus(res.application.status);
      setAmount(res.application.serviceType.baseFee);
    } catch (err: any) {
      console.error('Fetch details failed:', err);
      setError(err.message || t('adminDbErrorDesc'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Handle status update
  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusLoading(true);
    try {
      await updateApplicationStatus(id, nextStatus, remarks);
      setRemarks('');
      fetchDetails();
    } catch (err: any) {
      alert(err.message || (language === 'fil' ? 'Nabigong i-update ang status.' : 'Failed to update status.'));
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle Cash Payment recording (Restricted to Treasurer and Admin)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert(t('adminAppAmountAlert'));
      return;
    }
    setPaymentLoading(true);
    try {
      await recordCashPayment(id, orNumber, amount, datePaid);
      setOrNumber('');
      fetchDetails();
      alert(t('adminAppPaymentRecordedAlert'));
    } catch (err: any) {
      alert(err.message || (language === 'fil' ? 'Nabigong itala ang bayad.' : 'Failed to record payment.'));
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle Issuing document
  const handleIssueDocument = async () => {
    if (!confirm(t('adminAppConfirmIssue'))) return;
    setIssuingLoading(true);
    try {
      await issueDocument(id);
      fetchDetails();
      alert(t('adminAppIssueSuccess'));
    } catch (err: any) {
      alert(err.message || (language === 'fil' ? 'Nabigong ilabas ang dokumento.' : 'Failed to issue document.'));
    } finally {
      setIssuingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <Loader2 className="h-8 w-8 text-slate-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-medium">{language === 'fil' ? 'Kinukuha ang mga detalye ng aplikasyon...' : 'Fetching application details...'}</p>
      </div>
    );
  }

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
              onClick={fetchDetails}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              {t('adminRetryBtn')}
            </button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  // Robust recursive JSON parser — never throws, always returns a safe object
  const parseFormData = (val: any): Record<string, any> => {
    if (!val) return {};
    let parsed = val;
    while (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        return {};
      }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return {};
  };

  const formData = parseFormData(data.formData);
  const personal = formData?.personal || {};

  const currentBadge = statusBadges[data.status] || { label: data.status, style: 'bg-slate-100 text-slate-700' };
  const showTreasurerControls = userRole === 'TREASURER' || userRole === 'ADMIN';
  const isComplaint = data.serviceType?.category?.toUpperCase() === 'COMPLAINT' || data.serviceType?.name?.toLowerCase().includes('complaint');

  return (
    <div className="space-y-6">
      
      {/* Back to Applications Link */}
      <div>
        <Link 
          href="/admin/applications"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{t('adminBackToList')}</span>
        </Link>
      </div>

      {/* Main heading detail */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('adminAppPrefix')} {data.trackingNumber}</h1>
            <span className={`text-xs font-bold px-2.5 py-0.5 border rounded-full ${currentBadge.style}`}>
              {t(data.status)}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            {t('adminAppService')}: <strong className="text-slate-800">{data.serviceType.name}</strong> &bull; {t('adminAppSubmittedOn')}: {new Date(data.submittedAt).toLocaleDateString(language === 'fil' ? 'fil-PH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Action issue button when status is APPROVED */}
        {data.status === 'APPROVED' && (
          <button
            onClick={handleIssueDocument}
            disabled={issuingLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-bold shadow-md shadow-violet-100 transition-all disabled:opacity-50"
          >
            {issuingLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            <span>{t('adminAppIssueBtn')}</span>
          </button>
        )}
      </div>

      {/* ─── DUAL COLUMN GRID LAYOUT ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Citizen details & Documents preview */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Citizen Applicant Personal Details */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User size={18} className="text-slate-500" />
              <h2 className="font-bold text-slate-800 text-base">{t('adminAppCitizenInfo')}</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">{t('adminAppColName')}:</p>
                <p className="font-semibold text-slate-800">{personal.fullName || data.citizen.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">{t('adminAppColPhone')}:</p>
                <p className="font-semibold text-slate-800">{personal.phone || data.citizen.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">{t('adminAppColEmail')}:</p>
                <p className="font-semibold text-slate-800">{personal.email || data.citizen.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">{t('adminAppColBarangay')}:</p>
                <p className="font-semibold text-slate-800">
                  {(() => {
                    const raw = personal.barangay || data.citizen.barangay || 'N/A';
                    if (raw === 'N/A') return 'N/A';
                    const cleaned = raw.replace(/^(?:Brgy\.?|Barangay)\s+/i, '');
                    return `Barangay ${cleaned}`;
                  })()}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400 font-bold uppercase">{t('adminAppColAddress')}:</p>
                <p className="font-semibold text-slate-800">{personal.address || data.citizen.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Card 1.5: Application Details */}
          {formData?.details && Object.keys(formData.details).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText size={18} className="text-slate-500" />
                <h2 className="font-bold text-slate-800 text-base">{t('serviceFields')}</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {formData.details.purpose && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('purpose')}:</p>
                    <p className="font-semibold text-slate-800">{formData.details.purpose}</p>
                  </div>
                )}
                {formData.details.indigencyReason && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('indigencyReasonLabel')}:</p>
                    <p className="font-semibold text-slate-800">
                      {formData.details.indigencyReason === 'Scholarship' ? t('optScholarship') :
                       formData.details.indigencyReason === 'Medical Assistance' ? t('optMedical') :
                       formData.details.indigencyReason === 'Legal Aid' ? t('optLegal') :
                       formData.details.indigencyReason === 'Financial Assistance' ? t('optFinancial') : formData.details.indigencyReason}
                    </p>
                  </div>
                )}
                {formData.details.businessName && (
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('businessNameLabel')}:</p>
                    <p className="font-semibold text-slate-800">{formData.details.businessName}</p>
                  </div>
                )}
                {formData.details.businessAddress && (
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('businessAddressLabel')}:</p>
                    <p className="font-semibold text-slate-800">{formData.details.businessAddress}</p>
                  </div>
                )}
                {formData.details.capitalInvestment !== undefined && formData.details.capitalInvestment !== null && (
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('businessCapitalLabel')}:</p>
                    <p className="font-semibold text-slate-800">₱{Number(formData.details.capitalInvestment).toLocaleString()}</p>
                  </div>
                )}
                {formData.details.complaintType && (
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('complaintTypeLabel')}:</p>
                    <p className="font-semibold text-slate-800">{formData.details.complaintType}</p>
                  </div>
                )}
                {formData.details.respondentName && (
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('respondentNameLabel')}:</p>
                    <p className="font-semibold text-slate-800">{formData.details.respondentName}</p>
                  </div>
                )}
                {formData.details.incidentDate && (
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('incidentDateLabel')}:</p>
                    <p className="font-semibold text-slate-800">{new Date(formData.details.incidentDate).toLocaleDateString(language === 'fil' ? 'fil-PH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
                {formData.details.incidentLocation && (
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('incidentLocationLabel')}:</p>
                    <p className="font-semibold text-slate-800">{formData.details.incidentLocation}</p>
                  </div>
                )}
                {formData.details.incidentDetails && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400 font-bold uppercase">{t('incidentDetailsLabel')}:</p>
                    <p className="font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{formData.details.incidentDetails}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 2: Uploaded Documents list */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText size={18} className="text-slate-500" />
              <h2 className="font-bold text-slate-800 text-base">{t('adminAppDocsChecklist')}</h2>
            </div>

            {data.documents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">{t('adminAppNoDocs')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.documents.map((doc: any) => {
                  const isImage = doc.fileType.startsWith('image/');
                  return (
                    <div 
                      key={doc.id}
                      className="border border-slate-200 rounded-lg p-3 flex flex-col justify-between gap-3 bg-slate-50 hover:bg-white transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 truncate">{doc.filename}</p>
                        <p className="text-[10px] text-slate-400 font-medium capitalize">{doc.fileType.split('/')[1]} {language === 'fil' ? 'na file' : 'file'}</p>
                      </div>

                      {/* Preview Image in small thumbnail if image */}
                      {isImage && (
                        <div 
                          onClick={() => openLightbox(doc.fileUrl, doc.filename)}
                          className="h-28 w-full border border-slate-150 rounded-md overflow-hidden relative bg-white cursor-zoom-in group transition-all duration-200 hover:border-slate-300"
                        >
                          {imageErrors[doc.filename] ? (
                            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-1.5 p-2 text-center">
                              <AlertTriangle size={18} className="text-amber-500 animate-pulse" />
                              <span className="text-[10px] font-bold leading-tight">{language === 'fil' ? 'Hindi maipakita ang larawan' : 'Could not load image'}</span>
                            </div>
                          ) : (
                            <>
                              <img 
                                key={`${doc.filename}-retry-${imageRetries[doc.filename] || 0}`}
                                src={getImageSrc(doc.filename, doc.fileUrl)} 
                                alt={doc.filename} 
                                onError={() => handleImageError(doc.filename)}
                                className="h-full w-full object-contain group-hover:scale-[1.03] transition-transform duration-350 ease-out" 
                              />
                              <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/5 flex items-center justify-center transition-all duration-200">
                                <span className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-slate-900/80 text-white rounded text-[10px] font-bold shadow-md tracking-wider flex items-center gap-1 transition-all duration-200">
                                  <ZoomIn size={10} />
                                  <span>{language === 'fil' ? 'PANOORIN' : 'PREVIEW'}</span>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end pt-2 border-t border-slate-100">
                        <a 
                          href={getSafeUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900"
                        >
                          <Download size={12} />
                          <span>{t('adminAppDownloadOpen')}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 3: Timeline history logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <History size={18} className="text-slate-500" />
              <h2 className="font-bold text-slate-800 text-base">{t('adminAppActivityTimeline')}</h2>
            </div>

            <div className="flow-root">
              <ul className="-mb-8">
                {data.history.map((hist: any, index: number) => (
                  <li key={hist.id}>
                    <div className="relative pb-8">
                      {index !== data.history.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <div className="text-xs sm:text-sm text-slate-800">
                            <span className="font-bold text-slate-900">{hist.changedBy}</span>{' '}
                            ({hist.changedByRole.replace('_', ' ')}) {t('adminAppStatusHistoryText').replace('{old}', t(hist.oldStatus)).replace('{new}', t(hist.newStatus))}
                          </div>
                          {hist.remarks && (
                            <p className="mt-1 bg-slate-50 border border-slate-150 rounded px-2.5 py-1.5 text-xs text-slate-600 leading-relaxed font-semibold italic">
                              {t('adminAppRemarks')}: &ldquo;{hist.remarks}&rdquo;
                            </p>
                          )}
                          <div className="text-[10px] text-slate-400 font-medium mt-1">
                            {new Date(hist.changedAt).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-US')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Action controls for clerks and treasurers */}
        <div className="space-y-6">
          
          {/* Card A: Status update form for Clerks & Officers */}
          {userRole !== 'MAYOR' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CheckCircle2 size={18} className="text-slate-500" />
                <h2 className="font-bold text-slate-800 text-base">{t('adminAppProcessAction')}</h2>
              </div>

              <form onSubmit={handleStatusChange} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('adminAppChangeStatus')}</label>
                  <select
                    value={nextStatus}
                    onChange={e => setNextStatus(e.target.value)}
                    disabled={statusLoading}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none font-semibold"
                  >
                    <option value="SUBMITTED">{t('SUBMITTED')}</option>
                    <option value="UNDER_REVIEW">{t('UNDER_REVIEW')}</option>
                    {data.serviceType.baseFee > 0 && (
                      <option value="PENDING_PAYMENT">{t('PENDING_PAYMENT')}</option>
                    )}
                    <option value="APPROVED">{t('APPROVED')}</option>
                    <option value="REJECTED">{t('REJECTED')}</option>
                    {!isComplaint && (
                      <option value="RELEASED">{t('RELEASED')}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('adminAppRemarks')} {language === 'fil' ? '(Opsyonal)' : '(Optional)'}</label>
                  <textarea
                    placeholder={language === 'fil' ? 'Ilagay ang dahilan o puna ukol sa pagbabago ng katayuan...' : 'Enter reason or remarks for changing status...'}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    disabled={statusLoading}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none min-h-[90px] font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={statusLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
                >
                  {statusLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{statusLoading ? t('adminAppUpdateStatusLoading') : t('adminAppUpdateStatusBtn')}</span>
                </button>
              </form>
            </div>
          )}

          {/* Card B: Treasurer Cash Cashier payment form (TREASURER RESTRICTED) */}
          {data.serviceType.baseFee > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard size={18} className="text-slate-500" />
              <h2 className="font-bold text-slate-800 text-base">{t('adminAppCashCounter')}</h2>
            </div>

            {/* Display payment details list */}
            {data.payments.length > 0 ? (
              <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2 border border-slate-150">
                {data.payments.map((p: any) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-500">{t('adminAppAmountDue')}:</span>
                      <span className="text-slate-900">₱{p.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-500">{t('adminMethod')}:</span>
                      <span className="text-slate-950 font-bold">{p.method}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-500">{t('adminColStatus')}:</span>
                      <span className={`font-bold ${p.status === 'PAID' ? 'text-emerald-600' : 'text-rose-500'}`}>{p.status}</span>
                    </div>
                    {p.status === 'PAID' && (
                      <>
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500">{t('adminAppOrNumberLabel')}:</span>
                          <span className="text-slate-900 font-mono font-bold">{p.referenceNumber}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500">{t('adminAppDatePaidLabel')}:</span>
                          <span className="text-slate-900">{new Date(p.paidAt).toLocaleDateString(language === 'fil' ? 'fil-PH' : 'en-US')}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-3 text-xs flex justify-between font-semibold border border-slate-150">
                <span className="text-slate-500">{t('adminAppRequiredFee')}:</span>
                <span className="text-slate-900 font-bold">₱{data.serviceType.baseFee.toFixed(2)}</span>
              </div>
            )}

            {/* Mark as paid controls for Treasurer role */}
            {showTreasurerControls && (
              <form onSubmit={handleRecordPayment} className="space-y-3 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase">{t('adminAppRecordReceiptTitle')}</p>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">{t('adminAppOrNumberLabel')} {language === 'fil' ? '(Opsyonal)' : '(Optional)'}:</label>
                  <input
                    type="text"
                    placeholder={language === 'fil' ? 'Hal. OR-2026-0001' : 'e.g. OR-2026-0001'}
                    value={orNumber}
                    onChange={e => setOrNumber(e.target.value)}
                    disabled={paymentLoading}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none font-semibold font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">{language === 'fil' ? 'Halaga (PHP):' : 'Amount (PHP):'}</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                      disabled={paymentLoading}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">{language === 'fil' ? 'Petsa (Araw ng Pagbayad):' : 'Date Paid:'}</label>
                    <input
                      type="datetime-local"
                      required
                      value={datePaid}
                      onChange={e => setDatePaid(e.target.value)}
                      disabled={paymentLoading}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
                >
                  {paymentLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  <span>{paymentLoading ? t('adminAppRecordPaymentLoading') : t('adminAppRecordPaymentBtn')}</span>
                </button>
              </form>
            )}

            {/* GCash Maya coming soon label */}
            <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-dashed border-slate-200 mt-2">
              <p className="text-[10px] text-slate-400 font-bold">{t('adminAppGcashMayaDesc')}</p>
            </div>
          </div>
          )}

          {/* Card C: Issued Documents Result panel */}
          {data.issuedDocuments.length > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-violet-100 pb-3 text-violet-800">
                <ShieldCheck size={18} />
                <h2 className="font-bold text-base">{t('adminAppIssuedEdoc')}</h2>
              </div>
              
              {data.issuedDocuments.map((idoc: any) => (
                <div key={idoc.id} className="space-y-2 text-xs text-violet-800 font-semibold leading-relaxed">
                  <p>{t('adminAppIssuedEdocDesc')}</p>
                  <p><strong>{t('adminAppQrTokenKey')}:</strong> <code className="bg-violet-100 border border-violet-300 px-1 rounded text-[10px] font-mono">{idoc.qrToken}</code></p>
                  <p><strong>{t('adminAppIssuedDate')}:</strong> {new Date(idoc.issuedAt).toLocaleDateString(language === 'fil' ? 'fil-PH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <a 
                    href={idoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm mt-2"
                  >
                    <Download size={14} />
                    <span>{t('adminAppDownloadPdfBtn')}</span>
                  </a>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* ─── IMAGE LIGHTBOX PREVIEW MODAL ────────────────────────────────────── */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
          
          {/* Top Control Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between py-3 px-4 bg-slate-900/80 border border-slate-800 rounded-xl mb-4 text-white shadow-xl backdrop-blur select-none">
            <span className="font-extrabold text-sm sm:text-base tracking-tight truncate max-w-[200px] sm:max-w-md">
              {previewImage.title}
            </span>
            
            {/* Control buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setZoomScale(prev => {
                  const next = Math.max(prev - 0.25, 0.5);
                  if (next <= 1) setPanOffset({ x: 0, y: 0 });
                  return next;
                })}
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-400 w-12 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              
              <div className="h-4 w-px bg-slate-800 mx-1" />
              
              <button
                type="button"
                onClick={closeLightbox}
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Image Display Area */}
          <div 
            ref={lightboxRef}
            className="flex-1 w-full flex items-center justify-center overflow-hidden relative p-2 sm:p-6 select-none cursor-grab active:cursor-grabbing"
          >
            <img
              key={`${previewImage.title}-lightbox-retry-${imageRetries[previewImage.title] || 0}`}
              src={getImageSrc(previewImage.title, previewImage.url)}
              alt={previewImage.title}
              onError={() => handleImageError(previewImage.title)}
              onDoubleClick={handleDoubleClick}
              className={`object-contain max-w-full max-h-[75vh] rounded-lg shadow-2xl border border-slate-800/50 select-none ${
                zoomScale > 1 ? 'transition-transform duration-75 ease-out' : 'transition-transform duration-300 ease-out'
              }`}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              draggable={false}
            />
          </div>

          {/* Bottom Hint */}
          <div className="text-center mt-3 select-none">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              {zoomScale > 1 ? 'Drag to pan • ' : ''}{language === 'fil' ? 'I-scroll ang mouse wheel o gamitin ang mga pindutan para mag-zoom' : 'Scroll mouse wheel or use buttons to zoom'}
            </p>
          </div>
          
          {/* Overlay Click-to-close background */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={closeLightbox}
          />
        </div>
      )}

    </div>
  );
}
