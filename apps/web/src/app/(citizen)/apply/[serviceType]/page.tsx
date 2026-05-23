'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '../../../providers';
import { useQuery } from '@tanstack/react-query';
import { getServiceTypeById, getActiveLguConfig, submitApplication } from '../../../actions/citizen';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  FileText, 
  User, 
  ShieldCheck, 
  Upload, 
  CreditCard,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ─── STEP DEFINITIONS ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, key: 'personalInfo' },
  { id: 2, key: 'serviceFields' },
  { id: 3, key: 'uploadDocs' },
  { id: 4, key: 'reviewConfirm' },
  { id: 5, key: 'paymentSummary' }
];

// Zod schemas for validation
const personalInfoSchema = z.object({
  fullName: z.string().min(1, 'errRequired'),
  email: z.string().email('errEmail'),
  phone: z.string().regex(/^09\d{9}$/, 'errPhone'),
  address: z.string().min(1, 'errRequired'),
  barangay: z.string().min(1, 'errRequired'),
  age: z.number({ invalid_type_error: 'errRequired' }).min(15, 'Must be at least 15 years old'),
  civilStatus: z.string().min(1, 'errRequired'),
});

type PersonalInfoInput = z.infer<typeof personalInfoSchema>;

interface UploadedFile {
  filename: string;
  fileUrl: string;
  fileType: string;
}

export default function ApplicationWizardPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { t, language } = useLanguage();
  const serviceTypeId = params.serviceType as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [trackingNumber, setTrackingNumber] = useState('');
  
  // Custom Dynamic Service Fields State
  // Barangay Clearance
  const [purpose, setPurpose] = useState('Local Employment');
  const [purposeOther, setPurposeOther] = useState('');

  // Community Tax Certificate (Cedula)
  const [occupation, setOccupation] = useState('');

  // Certificate of Indigency
  const [indigencyPurpose, setIndigencyPurpose] = useState('Medical Assistance');
  const [indigencyPurposeOther, setIndigencyPurposeOther] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('Below ₱5,000');

  // Business Permit
  const [businessName, setBusinessName] = useState('');
  const [natureOfBusiness, setNatureOfBusiness] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [numberOfEmployees, setNumberOfEmployees] = useState('');

  // Working Permit
  const [employerName, setEmployerName] = useState('');
  const [typeOfWork, setTypeOfWork] = useState('');
  const [workAddress, setWorkAddress] = useState('');

  // Complaint Filing
  const [complaintType, setComplaintType] = useState('Noise Complaint');
  const [complaintTypeOther, setComplaintTypeOther] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [incidentDetails, setIncidentDetails] = useState('');
  
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Document upload state
  const [uploads, setUploads] = useState<Record<string, UploadedFile>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Previews, Lightbox & Error states
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageRetries, setImageRetries] = useState<Record<string, number>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
    // Reset error state and retry count to ensure clean retry flow inside the lightbox
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

  // Premium micro-interaction: toggle double-click to zoom
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

  const lightboxRef = React.useRef<HTMLDivElement>(null);

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

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch LGU Details
  const { data: lgu, isLoading: isLguLoading } = useQuery({
    queryKey: ['lguConfig'],
    queryFn: () => getActiveLguConfig(),
  });

  // Fetch Service Details
  const { data: service, isLoading: isServiceLoading } = useQuery({
    queryKey: ['serviceType', serviceTypeId],
    queryFn: () => getServiceTypeById(serviceTypeId),
  });

  // Generate tracking number on load
  useEffect(() => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000); // 6 digits
    
    let prefix = 'LGU';
    if (lgu?.municipality) {
      const clean = lgu.municipality.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const consonants = clean[0] + clean.slice(1).replace(/[aeiouAEIOU\s]/g, '');
      prefix = consonants.length >= 3 ? consonants.substring(0, 3).toUpperCase() : clean.substring(0, 3).toUpperCase();
    }
    
    setTrackingNumber(`${prefix}-${year}-${rand}`);
  }, [serviceTypeId, lgu]);

  // React Hook Form for Step 1
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PersonalInfoInput>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      barangay: '',
    }
  });

  // Auto-fill from session if user is logged in
  useEffect(() => {
    if (session?.user) {
      setValue('fullName', session.user.name || '');
      setValue('email', session.user.email || '');
    }
  }, [session, setValue]);

  // ─── STEP REDIRECT IF UNATHENTICATED ─────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  if (isServiceLoading || isLguLoading || sessionStatus === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Skeleton className="h-8 w-64 mx-auto mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">{t('serviceNotFoundTitle')}</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">{t('serviceNotFoundDesc')}</p>
        <Link href="/">
          <Button size="sm">{t('backHome')}</Button>
        </Link>
      </div>
    );
  }

  // ─── SERVICE TYPE DETECTION HELPERS ──────────────────────────────────────────
  const serviceName = service.name.toLowerCase();
  const isBarangayClearance = service.category?.toUpperCase() === 'CLEARANCE';
  const isCedula = serviceName.includes('cedula') || serviceName.includes('community tax');
  const isIndigency = serviceName.includes('indigency');
  const isBusinessPermit = serviceName.includes('business permit');
  const isWorkingPermit = serviceName.includes('working permit');
  const isComplaint = service.category?.toUpperCase() === 'COMPLAINT' || serviceName.includes('complaint');

  const activeSteps = isComplaint 
    ? STEPS.map(s => s.id === 2 ? { ...s, key: 'complaintFields' } : s).filter(s => s.id !== 5) 
    : STEPS;

  // ─── STEP ACTIONS ────────────────────────────────────────────────────────────

  // Step 1: Submit personal info
  const onStep1Submit = (_data: PersonalInfoInput) => {
    setCurrentStep(2);
  };

  // Step 2: Validate & Next
  const onStep2Next = () => {
    setStep2Error(null);
    // Service-specific validations
    if (isBusinessPermit) {
      const missing = [];
      if (!businessName) missing.push(t('businessNameLabel'));
      if (!natureOfBusiness) missing.push(t('natureOfBusinessLabel'));
      if (!businessAddress) missing.push(t('businessAddressLabel'));
      if (missing.length > 0) {
        setStep2Error(`${t('errRequired')}: ${missing.join(', ')}`);
        return;
      }
    }
    if (isWorkingPermit) {
      const missing = [];
      if (!employerName) missing.push(t('employerNameLabel'));
      if (!typeOfWork) missing.push(t('typeOfWorkLabel'));
      if (!workAddress) missing.push(t('workAddressLabel'));
      if (missing.length > 0) {
        setStep2Error(`${t('errRequired')}: ${missing.join(', ')}`);
        return;
      }
    }
    if (isComplaint) {
      const missing = [];
      if (!incidentDate) missing.push(t('incidentDateLabel'));
      if (!incidentLocation) missing.push(t('incidentLocationLabel'));
      if (!incidentDetails) missing.push(t('incidentDetailsLabel'));
      if (missing.length > 0) {
        setStep2Error(`${t('errRequired')}: ${missing.join(', ')}`);
        return;
      }
    }
    setCurrentStep(3);
  };

  // File Upload Handlers (Step 3)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, reqDocName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(t('errFileLimit'));
      return;
    }

    // Validate type
    const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!acceptedTypes.includes(file.type)) {
      setUploadError(t('errInvalidFileType'));
      return;
    }

    setUploadError(null);
    setIsUploading(prev => ({ ...prev, [reqDocName]: true }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lguId', lgu?.id || 'default');
    formData.append('trackingNumber', trackingNumber);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed upload');

      setUploads(prev => ({
        ...prev,
        [reqDocName]: {
          filename: data.name,
          fileUrl: data.url,
          fileType: file.type,
        }
      }));
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : 'Error uploading file');
    } finally {
      setIsUploading(prev => ({ ...prev, [reqDocName]: false }));
    }
  };

  const removeUpload = (reqDocName: string) => {
    setUploads(prev => {
      const copy = { ...prev };
      delete copy[reqDocName];
      return copy;
    });
  };

  // Step 3 Next validation: Require at least 1 document upload
  const onStep3Next = () => {
    const totalRequiredCount = service.requiredDocuments.length;
    const uploadedCount = Object.keys(uploads).length;
    
    if (totalRequiredCount > 0 && uploadedCount === 0) {
      setUploadError(t('reqFile'));
      return;
    }
    setUploadError(null);
    setCurrentStep(4);
  };

  // Build the unified form data payload based on service type
  const getCompiledFormData = () => {
    const personal = formStateGetValues();
    
    let details: any = {};
    if (isBarangayClearance) {
      details = {
        purpose: purpose === 'Others' ? purposeOther : purpose,
      };
    } else if (isCedula) {
      details = {
        occupation,
      };
    } else if (isIndigency) {
      details = {
        purpose: indigencyPurpose === 'Others' ? indigencyPurposeOther : indigencyPurpose,
        monthlyHouseholdIncome: monthlyIncome,
      };
    } else if (isBusinessPermit) {
      details = {
        businessName,
        natureOfBusiness,
        businessAddress,
        numberOfEmployees: parseInt(numberOfEmployees) || 0,
      };
    } else if (isWorkingPermit) {
      details = {
        employerName,
        typeOfWork,
        workAddress,
      };
    } else if (isComplaint) {
      details = {
        complaintType: complaintType === 'Others' ? complaintTypeOther : complaintType,
        incidentDate,
        incidentLocation,
        respondentName: respondentName || '',
        incidentDetails,
      };
    }

    return {
      personal,
      details,
    };
  };

  // Extract form state values helper
  const formStateGetValues = () => {
    const values = getValues();
    return {
      fullName: values.fullName || '',
      email: values.email || '',
      phone: values.phone || '',
      address: values.address || '',
      barangay: values.barangay || '',
      age: values.age || 21,
      civilStatus: values.civilStatus || 'Single',
    };
  };

  // Step 5: Final Submission to Prisma
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const compiledData = getCompiledFormData();
    const documentArray = Object.values(uploads);

    try {
      const res = await submitApplication({
        serviceTypeId: service.id,
        trackingNumber,
        formData: compiledData,
        documents: documentArray,
        amount: service.baseFee,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to submit application');
      }

      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setSubmitError(err instanceof Error ? err.message : 'Error submitting application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingNumber);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ─── RENDERING ACTIONS BASED ON SUCCESS STATE ────────────────────────────────
  if (showSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-slate-200 shadow-xl overflow-hidden text-center bg-white">
          {/* Animated checkmark */}
          <div className="h-1.5 w-full bg-emerald-500" />
          
          <CardContent className="pt-12 pb-12 px-6 sm:px-12 space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
              <CheckCircle className="h-12 w-12 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('successTitle')}
              </h1>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                {t('successSubtitle')}
              </p>
            </div>

            {/* Tracking number badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-md mx-auto relative group">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                {t('trackingNo')}
              </span>
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-primary tracking-widest">
                {trackingNumber}
              </span>
              
              <div className="mt-4 flex justify-center gap-2">
                <Button 
                  onClick={handleCopyTracking}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1.5 font-semibold text-xs border-slate-200"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>{t('copySuccess')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-500" />
                      <span>{t('copyBtn')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Details details */}
            <div className="text-xs text-left bg-blue-50/30 border border-blue-100/50 p-4 rounded-xl max-w-md mx-auto flex gap-3 text-slate-600 leading-relaxed">
              <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">{t('nextStepTitle')}</span>
                {isComplaint ? (
                  <span>{t('nextStepComplaintDesc')}</span>
                ) : (
                  <>
                    {t('nextStepDesc')}<strong>₱{service.baseFee.toFixed(2)}</strong>{t('nextStepDescSuffix')}
                  </>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/track?number=${trackingNumber}`} className="w-full sm:w-auto">
              <Button className="w-full font-semibold shadow-sm">
                {t('trackBtn')}
              </Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full font-semibold border-slate-200">
                {t('backHome')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      
      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else router.push('/');
          }}
          className="rounded-full border border-slate-200 bg-white shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            {service.name}
          </h1>
          <p className="text-xs text-slate-500">
            {t('baseFee')}: <strong>{service.baseFee === 0 ? t('free') : `₱${service.baseFee.toFixed(2)}`}</strong> • {t('processingTime')}: <strong>{service.processingDays} {service.processingDays === 1 ? t('day') : t('days')}</strong>
          </p>
        </div>
      </div>

      {/* ─── STEP INDICATOR WIZARD BAR ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -translate-y-1/2 -z-0" />
          
          {activeSteps.map((s, idx) => {
            const isCompleted = currentStep > s.id;
            const isActive = currentStep === s.id;
            const displayId = idx + 1;

            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                  isCompleted 
                    ? 'bg-primary border-primary text-white shadow shadow-primary/20'
                    : isActive
                      ? 'bg-white border-primary text-primary ring-4 ring-primary/10'
                      : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle className="h-4.5 w-4.5" /> : displayId}
                </span>
                <span className={`hidden sm:inline-block text-[10px] font-bold mt-1.5 uppercase tracking-wider ${
                  isActive ? 'text-primary' : 'text-slate-400'
                }`}>
                  {t(s.key)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── STEP 1: PERSONAL INFORMATION ────────────────────────────────────── */}
      {currentStep === 1 && (
        <Card className="border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('personalInfo')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('personalInfoDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form id="personal-form" onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-bold text-slate-600">{t('fullName')}</Label>
                  <Input id="fullName" {...register('fullName')} className="border-slate-200" />
                  {errors.fullName && <p className="text-[10px] text-rose-500 font-bold">{t(errors.fullName.message!)}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-600">{t('email')}</Label>
                  <Input id="email" type="email" {...register('email')} className="border-slate-200" />
                  {errors.email && <p className="text-[10px] text-rose-500 font-bold">{t(errors.email.message!)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-600">{t('phone')}</Label>
                  <Input id="phone" placeholder="09xxxxxxxxx" {...register('phone')} className="border-slate-200" />
                  {errors.phone && <p className="text-[10px] text-rose-500 font-bold">{t(errors.phone.message!)}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="barangay" className="text-xs font-bold text-slate-600">{t('barangay')}</Label>
                  <Input id="barangay" placeholder="e.g. Barangay Centro 1" {...register('barangay')} className="border-slate-200" />
                  {errors.barangay && <p className="text-[10px] text-rose-500 font-bold">{t(errors.barangay.message!)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="age" className="text-xs font-bold text-slate-600">Age</Label>
                  <Input id="age" type="number" placeholder="21" {...register('age', { valueAsNumber: true })} className="border-slate-200" />
                  {errors.age && <p className="text-[10px] text-rose-500 font-bold">{t(errors.age.message!)}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="civilStatus" className="text-xs font-bold text-slate-600">Civil Status</Label>
                  <select 
                    id="civilStatus" 
                    {...register('civilStatus')}
                    className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                  {errors.civilStatus && <p className="text-[10px] text-rose-500 font-bold">{t(errors.civilStatus.message!)}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-bold text-slate-600">{t('address')}</Label>
                <Input id="address" placeholder="House No, Street, Subdivision" {...register('address')} className="border-slate-200" />
                {errors.address && <p className="text-[10px] text-rose-500 font-bold">{t(errors.address.message!)}</p>}
              </div>
            </form>
          </CardContent>
          <CardFooter className="justify-end border-t border-slate-100 pt-4">
            <Button type="submit" form="personal-form" className="flex items-center gap-1.5 font-semibold">
              <span>{t('next')}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ─── STEP 2: SERVICE SPECIFIC FIELDS ─────────────────────────────────── */}
      {currentStep === 2 && (
        <Card className="border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isComplaint ? t('complaintFields') : t('serviceFields')}
            </CardTitle>
            <CardDescription className="text-xs">
              {isComplaint ? t('complaintFieldsDesc') : t('serviceFieldsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* ── BARANGAY CLEARANCE ──────────────────────────────── */}
            {isBarangayClearance && (
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-600">{t('purpose')}</Label>
                <select 
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:ring-primary focus-visible:outline-none"
                >
                  <option value="Local Employment">{t('optEmployment')}</option>
                  <option value="Travel Abroad">{t('optTravelAbroad')}</option>
                  <option value="Bank Requirement">{t('optBankRequirement')}</option>
                  <option value="School Requirement">{t('optSchoolRequirement')}</option>
                  <option value="Police Clearance Requirement">{t('optPoliceClearance')}</option>
                  <option value="Others">{t('optOthers')}</option>
                </select>

                {purpose === 'Others' && (
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs font-bold text-slate-500">{t('specifyPurpose')}</Label>
                    <Input 
                      value={purposeOther} 
                      onChange={(e) => setPurposeOther(e.target.value)} 
                      placeholder="e.g. Bank Account Opening" 
                      className="border-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── CEDULA ──────────────────────────────── */}
            {isCedula && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('occupationLabel')}</Label>
                  <Input 
                    value={occupation} 
                    onChange={(e) => setOccupation(e.target.value)} 
                    placeholder="e.g. Employee, Business Owner, Student" 
                    className="border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* ── CERTIFICATE OF INDIGENCY ─────────────────────────── */}
            {isIndigency && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('indigencyReasonLabel')}</Label>
                  <select 
                    value={indigencyPurpose}
                    onChange={(e) => setIndigencyPurpose(e.target.value)}
                    className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <option value="Medical Assistance">{t('optMedical')}</option>
                    <option value="Educational Assistance">{t('optEducationalAssistance')}</option>
                    <option value="Government Benefit">{t('optGovernmentBenefit')}</option>
                    <option value="Legal Aid">{t('optLegal')}</option>
                    <option value="Others">{t('optOthersReason')}</option>
                  </select>

                  {indigencyPurpose === 'Others' && (
                    <div className="space-y-1.5 pt-2">
                      <Label className="text-xs font-bold text-slate-500">{t('specifyReason')}</Label>
                      <Input 
                        value={indigencyPurposeOther} 
                        onChange={(e) => setIndigencyPurposeOther(e.target.value)} 
                        placeholder="e.g. Burial Assistance" 
                        className="border-slate-200"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('monthlyIncomeLabel')}</Label>
                  <select 
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <option value="Below ₱5,000">{t('optIncomeBelow5k')}</option>
                    <option value="₱5,000–₱10,000">{t('optIncome5kTo10k')}</option>
                    <option value="Above ₱10,000">{t('optIncomeAbove10k')}</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── BUSINESS PERMIT ──────────────────────────────────── */}
            {isBusinessPermit && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('businessNameLabel')} <span className="text-rose-500">*</span></Label>
                  <Input 
                    value={businessName} 
                    onChange={(e) => setBusinessName(e.target.value)} 
                    placeholder="e.g. Local Sari-Sari Store" 
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('natureOfBusinessLabel')} <span className="text-rose-500">*</span></Label>
                  <Input 
                    value={natureOfBusiness} 
                    onChange={(e) => setNatureOfBusiness(e.target.value)} 
                    placeholder="e.g. Retail, Food Services, Manufacturing" 
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('businessAddressLabel')} <span className="text-rose-500">*</span></Label>
                  <Input 
                    value={businessAddress} 
                    onChange={(e) => setBusinessAddress(e.target.value)} 
                    placeholder="Street, Barangay, Peñablanca" 
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('numberOfEmployeesLabel')}</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={numberOfEmployees} 
                    onChange={(e) => setNumberOfEmployees(e.target.value)} 
                    placeholder="e.g. 5" 
                    className="border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* ── WORKING PERMIT ───────────────────────────────────── */}
            {isWorkingPermit && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('employerNameLabel')} <span className="text-rose-500">*</span></Label>
                  <Input 
                    value={employerName} 
                    onChange={(e) => setEmployerName(e.target.value)} 
                    placeholder="e.g. ABC Construction Company" 
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('typeOfWorkLabel')} <span className="text-rose-500">*</span></Label>
                  <Input 
                    value={typeOfWork} 
                    onChange={(e) => setTypeOfWork(e.target.value)} 
                    placeholder="e.g. Construction Worker, Cashier, Driver" 
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('workAddressLabel')} <span className="text-rose-500">*</span></Label>
                  <Input 
                    value={workAddress} 
                    onChange={(e) => setWorkAddress(e.target.value)} 
                    placeholder="Street, Barangay, Municipality" 
                    className="border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* ── COMPLAINT FILING ─────────────────────────────────── */}
            {isComplaint && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('complaintTypeLabel')}</Label>
                  <select 
                    value={complaintType}
                    onChange={(e) => setComplaintType(e.target.value)}
                    className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <option value="Noise Complaint">{t('optNoiseComplaint')}</option>
                    <option value="Property Dispute">{t('optPropertyDispute')}</option>
                    <option value="Physical Altercation">{t('optPhysicalAltercation')}</option>
                    <option value="Theft/Robbery">{t('optTheftRobbery')}</option>
                    <option value="Others">{t('optOthers')}</option>
                  </select>

                  {complaintType === 'Others' && (
                    <div className="space-y-1.5 pt-2">
                      <Label className="text-xs font-bold text-slate-500">{t('specifyPurpose')}</Label>
                      <Input 
                        value={complaintTypeOther} 
                        onChange={(e) => setComplaintTypeOther(e.target.value)} 
                        placeholder="e.g. Harassment, Vandalism" 
                        className="border-slate-200"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('incidentDateLabel')} <span className="text-rose-500">*</span></Label>
                  <Input 
                    type="date"
                    value={incidentDate} 
                    onChange={(e) => setIncidentDate(e.target.value)} 
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('incidentLocationLabel')} <span className="text-rose-500">*</span></Label>
                  <Input 
                    value={incidentLocation} 
                    onChange={(e) => setIncidentLocation(e.target.value)} 
                    placeholder="e.g. Purok 3, Barangay Centro" 
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('respondentNameLabel')}</Label>
                  <Input 
                    value={respondentName} 
                    onChange={(e) => setRespondentName(e.target.value)} 
                    placeholder="Pangalan ng taong inirereklamo (kung alam)" 
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">{t('incidentDetailsLabel')} <span className="text-rose-500">*</span></Label>
                  <textarea 
                    value={incidentDetails} 
                    onChange={(e) => setIncidentDetails(e.target.value)} 
                    placeholder={t('incidentDetailsPlaceholder') || 'Clearly describe the details of the incident...'}
                    className="w-full flex min-h-[120px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border-slate-200 leading-relaxed"
                  />
                </div>
              </div>
            )}

            {step2Error && (
              <Alert variant="destructive" className="mt-4 border-rose-200 bg-rose-50/50">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                <AlertDescription className="text-rose-700 text-[11px] font-semibold">
                  {step2Error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-between border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="border-slate-200 font-semibold text-slate-600">
              {t('back')}
            </Button>
            <Button onClick={onStep2Next} className="flex items-center gap-1.5 font-semibold">
              <span>{t('next')}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ─── STEP 3: DOCUMENT UPLOADS ────────────────────────────────────────── */}
      {currentStep === 3 && (
        <Card className="border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              {t('uploadDocs')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('uploadDocsDesc')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            
            {uploadError && (
              <Alert variant="destructive" className="border-rose-200 bg-rose-50/50">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                <AlertDescription className="text-rose-700 text-[11px] font-semibold">
                  {uploadError}
                </AlertDescription>
              </Alert>
            )}

            {/* List of requirements */}
            <div className="space-y-4">
              {isComplaint ? (
                (() => {
                  const slots = ['Supporting Evidence 1', 'Supporting Evidence 2', 'Supporting Evidence 3'];
                  const uploadedSlots = slots.filter(slot => uploads[slot]);
                  const canUploadMore = uploadedSlots.length < 3;
                  const nextSlot = slots.find(slot => !uploads[slot]);

                  return (
                    <div className="space-y-4">
                      {/* Description / Instructions */}
                      <div className="text-xs text-slate-500 bg-blue-50/40 border border-blue-100 rounded-xl p-4 leading-relaxed">
                        <p className="font-semibold text-slate-700 mb-1">
                          {language === 'fil' ? 'Mga Suportang Ebidensya (Opsyonal)' : 'Supporting Evidence (Optional)'}
                        </p>
                        <p>
                          {language === 'fil'
                            ? 'Maaari kang mag-upload ng hanggang 3 file (larawan, dokumento, o salaysay ng saksi) upang suportahan ang iyong reklamo. Ang hakbang na ito ay opsyonal — maaari mong ipagpatuloy ang pag-file kahit walang upload.'
                            : 'You can optionally upload up to 3 files (photos, documents, or witness statements) to support your complaint. This step is entirely optional — you may proceed without uploading files.'}
                        </p>
                      </div>

                      {/* Render uploaded files */}
                      {uploadedSlots.map((slotName) => {
                        const uploadedFile = uploads[slotName];

                        return (
                          <div key={slotName} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-slate-700 block">{slotName}</Label>
                              <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border-emerald-200">
                                {language === 'fil' ? 'Nai-upload' : 'Uploaded'}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 bg-emerald-50 rounded border border-emerald-100 flex items-center justify-center text-emerald-600">
                                  <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-slate-700 truncate max-w-[200px] sm:max-w-[350px]">
                                    {uploadedFile.filename}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono uppercase">
                                    {uploadedFile.fileType}
                                  </span>
                                </div>
                              </div>

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeUpload(slotName)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full h-8 w-8"
                                title="Remove file"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Upload zone for the next slot if allowed */}
                      {canUploadMore && nextSlot && (
                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-700 block">
                              {language === 'fil' ? `Suportang Ebidensya ${uploadedSlots.length + 1}` : `Supporting Evidence ${uploadedSlots.length + 1}`}
                            </Label>
                            <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border-amber-200">
                              {language === 'fil' ? 'Opsyonal' : 'Optional'}
                            </Badge>
                          </div>

                          <div className="relative border-2 border-dashed border-slate-200 rounded-lg hover:border-primary/40 transition-colors bg-white flex flex-col items-center justify-center p-6 text-center group">
                            <input 
                              type="file" 
                              id={`file-input-${nextSlot}`}
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={isUploading[nextSlot]}
                              onChange={(e) => handleFileUpload(e, nextSlot)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            {isUploading[nextSlot] ? (
                              <div className="space-y-2 flex flex-col items-center">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                <span className="text-[11px] font-bold text-slate-500">{t('uploading')}</span>
                              </div>
                            ) : (
                              <div className="space-y-2 flex flex-col items-center">
                                <Upload className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors" />
                                <span className="text-[11px] font-semibold text-slate-600 block">{t('dragDrop')}</span>
                                <span className="text-[9px] text-slate-400 font-medium">{t('maxSize')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                service.requiredDocuments.map((reqDoc: string, idx: number) => {
                  const uploadedFile = uploads[reqDoc];
                  const uploading = isUploading[reqDoc];

                  return (
                    <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-700 block">{reqDoc}</Label>
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          uploadedFile ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {uploadedFile ? 'Uploaded' : 'Required'}
                        </Badge>
                      </div>

                      {/* Drag drop zone */}
                      {!uploadedFile ? (
                        <div className="relative border-2 border-dashed border-slate-200 rounded-lg hover:border-primary/40 transition-colors bg-white flex flex-col items-center justify-center p-6 text-center group">
                          <input 
                            type="file" 
                            id={`file-input-${idx}`}
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={uploading}
                            onChange={(e) => handleFileUpload(e, reqDoc)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          {uploading ? (
                            <div className="space-y-2 flex flex-col items-center">
                              <Loader2 className="h-8 w-8 text-primary animate-spin" />
                              <span className="text-[11px] font-bold text-slate-500">{t('uploading')}</span>
                            </div>
                          ) : (
                            <div className="space-y-2 flex flex-col items-center">
                              <Upload className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors" />
                              <span className="text-[11px] font-semibold text-slate-600 block">{t('dragDrop')}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{t('maxSize')}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Uploaded Preview card */
                        <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 bg-emerald-50 rounded border border-emerald-100 flex items-center justify-center text-emerald-600">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-700 truncate max-w-[200px] sm:max-w-[350px]">
                                {uploadedFile.filename}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">
                                {uploadedFile.fileType}
                              </span>
                            </div>
                          </div>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeUpload(reqDoc)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full h-8 w-8"
                            title="Remove file"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </CardContent>
          <CardFooter className="justify-between border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)} className="border-slate-200 font-semibold text-slate-600">
              {t('back')}
            </Button>
            <Button onClick={onStep3Next} className="flex items-center gap-1.5 font-semibold">
              <span>{t('next')}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ─── STEP 4: REVIEW & CONFIRM ────────────────────────────────────────── */}
      {currentStep === 4 && (
        <Card className="border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t('reviewConfirm')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('reviewConfirmDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {submitError && (
              <Alert variant="destructive" className="border-rose-200 bg-rose-50/50 mb-4">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                <AlertDescription className="text-rose-700 text-xs font-bold">
                  {submitError}
                </AlertDescription>
              </Alert>
            )}

            {/* Section 1: Personal Info */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('personalInfo')}</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-slate-400 mb-0.5">{t('fullName')}</span>
                  <span className="font-bold text-slate-700">{formStateGetValues().fullName}</span>
                </div>
                <div>
                  <span className="block text-slate-400 mb-0.5">{t('email')}</span>
                  <span className="font-bold text-slate-700">{formStateGetValues().email}</span>
                </div>
                <div>
                  <span className="block text-slate-400 mb-0.5">{t('phone')}</span>
                  <span className="font-bold text-slate-700">{formStateGetValues().phone}</span>
                </div>
                <div>
                  <span className="block text-slate-400 mb-0.5">{t('barangay')}</span>
                  <span className="font-bold text-slate-700">{formStateGetValues().barangay}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-slate-400 mb-0.5">{t('address')}</span>
                  <span className="font-bold text-slate-700">{formStateGetValues().address}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Service Details */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{isComplaint ? t('complaintFields') : t('serviceFields')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">

                {/* Barangay Clearance */}
                {isBarangayClearance && (
                  <div>
                    <span className="block text-slate-400 mb-0.5">{t('purpose')}</span>
                    <span className="font-bold text-slate-700">
                      {purpose === 'Others' ? purposeOther : purpose}
                    </span>
                  </div>
                )}

                {/* Community Tax Certificate (Cedula) */}
                {isCedula && (
                  <>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('occupationLabel')}</span>
                      <span className="font-bold text-slate-700">{occupation || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('civilStatusLabel')}</span>
                      <span className="font-bold text-slate-700">{formStateGetValues().civilStatus}</span>
                    </div>
                  </>
                )}

                {/* Certificate of Indigency */}
                {isIndigency && (
                  <>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('indigencyReasonLabel')}</span>
                      <span className="font-bold text-slate-700">
                        {indigencyPurpose === 'Others' ? indigencyPurposeOther : indigencyPurpose}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('monthlyIncomeLabel')}</span>
                      <span className="font-bold text-slate-700">{monthlyIncome}</span>
                    </div>
                  </>
                )}

                {/* Business Permit */}
                {isBusinessPermit && (
                  <>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('businessNameLabel')}</span>
                      <span className="font-bold text-slate-700">{businessName}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('natureOfBusinessLabel')}</span>
                      <span className="font-bold text-slate-700">{natureOfBusiness}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('businessAddressLabel')}</span>
                      <span className="font-bold text-slate-700">{businessAddress}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('numberOfEmployeesLabel')}</span>
                      <span className="font-bold text-slate-700">{numberOfEmployees || '0'}</span>
                    </div>
                  </>
                )}

                {/* Working Permit */}
                {isWorkingPermit && (
                  <>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('employerNameLabel')}</span>
                      <span className="font-bold text-slate-700">{employerName}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('typeOfWorkLabel')}</span>
                      <span className="font-bold text-slate-700">{typeOfWork}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-slate-400 mb-0.5">{t('workAddressLabel')}</span>
                      <span className="font-bold text-slate-700">{workAddress}</span>
                    </div>
                  </>
                )}

                {/* Complaint Filing */}
                {isComplaint && (
                  <>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('complaintTypeLabel')}</span>
                      <span className="font-bold text-slate-700">
                        {complaintType === 'Others' ? complaintTypeOther : complaintType}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('incidentDateLabel')}</span>
                      <span className="font-bold text-slate-700">{incidentDate}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('incidentLocationLabel')}</span>
                      <span className="font-bold text-slate-700">{incidentLocation}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-0.5">{t('respondentNameLabel')}</span>
                      <span className="font-bold text-slate-700">{respondentName || '—'}</span>
                    </div>
                    <div className="col-span-1 sm:col-span-2 mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="block text-slate-400 mb-1 font-semibold">{t('incidentDetailsLabel')}</span>
                      <span className="font-medium text-slate-700 block whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto pr-2">{incidentDetails}</span>
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* Section 3: Uploads */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('uploadDocs')}</h3>
              {Object.keys(uploads).length === 0 ? (
                <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/30 text-slate-400 font-medium text-xs">
                  {isComplaint ? (
                    language === 'fil' ? 'Walang nai-upload na suportang ebidensya' : 'No supporting evidence uploaded'
                  ) : (
                    language === 'fil' ? 'Walang mga file na nai-upload' : 'No files uploaded'
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(uploads).map(([reqDocName, uploadFile], idx) => {
                    const isImage = uploadFile.fileType.startsWith('image/') || 
                                    /\.(jpg|jpeg|png|gif|webp)$/i.test(uploadFile.filename);
                    const isPdf = uploadFile.fileType === 'application/pdf';
                    const hasImageError = imageErrors[reqDocName];

                    return (
                      <div 
                        key={idx} 
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('a') || target.closest('button')) {
                            return;
                          }
                          if (isImage) {
                            openLightbox(uploadFile.fileUrl, reqDocName);
                          }
                        }}
                        className={`flex gap-4 p-3 bg-slate-50/50 border border-slate-100 rounded-xl transition-all duration-200 group ${
                          isImage ? 'cursor-pointer hover:border-primary/30 hover:bg-slate-50/80 hover:shadow-sm' : ''
                        }`}
                      >
                        {/* Left: Thumbnail/Icon */}
                        <div 
                          className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center relative select-none ${
                            isImage ? 'cursor-zoom-in hover:border-primary/50' : ''
                          }`}
                        >
                          {isImage && !hasImageError ? (
                            <>
                              <img
                                key={`${reqDocName}-retry-${imageRetries[reqDocName] || 0}`}
                                src={getImageSrc(reqDocName, uploadFile.fileUrl)}
                                alt={reqDocName}
                                onError={() => handleImageError(reqDocName)}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <ZoomIn className="h-5 w-5" />
                              </div>
                            </>
                          ) : isImage && hasImageError ? (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageErrors(prev => ({ ...prev, [reqDocName]: false }));
                                setImageRetries(prev => ({ ...prev, [reqDocName]: 0 }));
                              }}
                              className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 hover:bg-amber-50/50 hover:text-amber-700 hover:border-amber-200 transition-colors cursor-pointer"
                            >
                              <AlertTriangle className="h-6 w-6 text-amber-500 mb-1 animate-pulse" />
                              <span className="text-[8px] font-bold text-amber-600 uppercase tracking-wider text-center px-1">Failed</span>
                              <span className="text-[7px] text-slate-500 underline font-semibold mt-0.5">Click to retry</span>
                            </div>
                          ) : isPdf ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50/50 text-rose-600">
                              <FileText className="h-7 w-7 text-rose-500 mb-1" />
                              <span className="text-[8px] font-black tracking-wider uppercase bg-rose-100 text-rose-700 px-1 py-0.5 rounded-sm">PDF</span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                              <Image className="h-7 w-7 text-slate-300 mb-1" />
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Image</span>
                            </div>
                          )}
                        </div>

                        {/* Right: Info & Actions */}
                        <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-slate-800 tracking-tight block truncate" title={reqDocName}>
                              {reqDocName}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">
                              {isImage ? t('imageLabel') : isPdf ? t('pdfLabel') : 'Document'}
                            </span>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-1" title={uploadFile.filename}>
                              {uploadFile.filename}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 mt-2">
                            {isImage && (
                              <button
                                onClick={() => openLightbox(uploadFile.fileUrl, reqDocName)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline transition-colors"
                              >
                                <span>{t('viewFile')}</span>
                                <ZoomIn className="h-3 w-3" />
                              </button>
                            )}
                            <a
                              href={getSafeUrl(uploadFile.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:underline transition-colors"
                            >
                              <span>Open Link</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </CardContent>
          <CardFooter className="justify-between border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="border-slate-200 font-semibold text-slate-600" disabled={isSubmitting}>
              {t('back')}
            </Button>
            {isComplaint ? (
              <Button 
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 font-semibold shadow-sm hover:shadow"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>{t('submitting')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4.5 w-4.5" />
                    <span>{t('submit')}</span>
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => setCurrentStep(5)} className="flex items-center gap-1.5 font-semibold">
                <span>{t('next')}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* ─── STEP 5: PAYMENT SUMMARY (Pay at Counter Only) ────────────────────── */}
      {currentStep === 5 && (
        <Card className="border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t('paymentSummary')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('paymentSummaryDesc')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            
            {submitError && (
              <Alert variant="destructive" className="border-rose-200 bg-rose-50/50">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                <AlertDescription className="text-rose-700 text-xs font-bold">
                  {submitError}
                </AlertDescription>
              </Alert>
            )}

            {/* Price block */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center max-w-sm mx-auto shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                {t('amountDue')}
              </span>
              <span className="text-3xl font-extrabold text-slate-800">
                ₱{service.baseFee.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 block mt-1.5 font-medium">
                ({service.name})
              </span>
            </div>

            {/* Payment options selection */}
            <div className="space-y-4 pt-2">
              <Label className="text-xs font-bold text-slate-600 block mb-2">{t('paymentMethod')}</Label>
              
              <RadioGroup defaultValue="counter" className="space-y-3">
                
                {/* Pay at counter (enabled) */}
                <div className="flex items-start gap-3 border border-slate-200 p-4 rounded-xl bg-slate-50/20 hover:border-slate-300 transition-colors shadow-sm">
                  <RadioGroupItem value="counter" id="counter" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="counter" className="text-sm font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      {t('counterOption')}
                      <Badge className="bg-primary/10 text-primary border-none text-[9px] uppercase px-1.5 font-bold">
                        {t('activeBadge')}
                      </Badge>
                    </Label>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {t('counterDesc')}
                    </p>
                  </div>
                </div>

                {/* GCash/Maya (disabled) */}
                <div className="flex items-start gap-3 border border-slate-100 p-4 rounded-xl bg-slate-50/10 opacity-60">
                  <RadioGroupItem value="online" id="online" disabled className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="online" className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                      {t('onlineOption')}
                      <Badge className="bg-slate-100 text-slate-500 border border-slate-200 text-[8px] uppercase px-1.5 font-bold">
                        {t('comingSoon')}
                      </Badge>
                    </Label>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t('onlineOptionDesc')}
                    </p>
                  </div>
                </div>

              </RadioGroup>
            </div>

          </CardContent>
          <CardFooter className="justify-between border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)} className="border-slate-200 font-semibold text-slate-600" disabled={isSubmitting}>
              {t('back')}
            </Button>
            <Button 
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 font-semibold shadow-sm hover:shadow"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4.5 w-4.5" />
                  <span>{t('submit')}</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomScale(prev => {
                  const next = Math.max(prev - 0.25, 0.5);
                  if (next <= 1) setPanOffset({ x: 0, y: 0 });
                  return next;
                })}
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono font-bold text-slate-400 w-12 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Reset Zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <div className="h-4 w-px bg-slate-800 mx-1" />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLightbox}
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Close"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
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
              {zoomScale > 1 ? 'Drag to pan • ' : ''}Scroll mouse wheel or use buttons to zoom
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
