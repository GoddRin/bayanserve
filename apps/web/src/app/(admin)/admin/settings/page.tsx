'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  getSettingsData, 
  updateLguSettings, 
  updateServiceTypeSettings, 
  inviteStaffMember, 
  toggleStaffStatus, 
  updateEmailTemplate 
} from '@/app/actions/admin';
import { 
  Building, 
  Briefcase, 
  Users, 
  Mail, 
  Upload, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/app/providers';

type ActiveTab = 'profile' | 'services' | 'staff' | 'emails';

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Form States
  const [lguName, setLguName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [province, setProvince] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1a3c6e');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Logo file state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Service Type Forms States
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [serviceDays, setServiceDays] = useState<number>(1);
  const [serviceActive, setServiceActive] = useState<boolean>(true);
  const [serviceSaving, setServiceSaving] = useState(false);

  // Staff Form States
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState('DEPARTMENT_OFFICER');
  const [staffInviting, setStaffInviting] = useState(false);
  const [staffInviteSuccess, setStaffInviteSuccess] = useState(false);

  // Email Template Form States
  const [selectedTemplateType, setSelectedTemplateType] = useState('EMAIL');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSettingsData();
      setData(res);
      
      // Seed Profile values
      setLguName(res.lgu.name);
      setMunicipality(res.lgu.municipality);
      setProvince(res.lgu.province);
      setPrimaryColor(res.lgu.primaryColor);
      setContactEmail(res.lgu.contactEmail);
      setContactPhone(res.lgu.contactPhone);
      setLogoUrl(res.lgu.logoUrl);

      // Seed Email template if exists
      const emailTemp = res.emailTemplates.find((t: any) => t.type === 'EMAIL');
      if (emailTemp) {
        setTemplateSubject(emailTemp.subject);
        setTemplateBody(emailTemp.body);
      } else {
        // default placeholders
        setTemplateSubject('BayanServe — Inilabas na ang iyong {SERVICE_NAME}');
        setTemplateBody(
`<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
  <h2>Magandang araw, {NAME}!</h2>
  <p>Ang iyong aplikasyon para sa <strong>{SERVICE_NAME}</strong> na may tracking number <strong>{TRACKING_NO}</strong> ay matagumpay na inilabas ng {LGU_NAME}!</p>
  <p>Maaari mo nang ma-download ang iyong digital document sa link sa ibaba:</p>
  <p><a href="{DOWNLOAD_URL}" style="display:inline-block; background:#1a3c6e; color:#fff; padding:10px 20px; border-radius:5px; text-decoration:none;">I-download ang Dokumento</a></p>
  <p>Upang masiguro ang kredensyal at pagiging lehitimo nito, maaari itong i-verify online sa link na ito:</p>
  <p><a href="{VERIFY_URL}">{VERIFY_URL}</a></p>
  <hr style="border:none; border-top:1px solid #eee; margin:30px 0;" />
  <p style="font-size:12px; color:#777;">Ito ay isang awtomatikong email mula sa {LGU_NAME} BayanServe Civic Portal.</p>
</div>`
        );
      }

    } catch (err: any) {
      console.error('Fetch settings failed:', err);
      setError(err.message || (language === 'fil' ? 'Hindi ma-access ang database. Makipag-ugnayan sa inyong IT administrator.' : 'Database connection failure. Please contact your IT administrator.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update LGU Settings
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateLguSettings({
        name: lguName,
        municipality,
        province,
        primaryColor,
        contactEmail,
        contactPhone,
        logoUrl
      });
      alert(language === 'fil' ? 'Matagumpay na nai-save ang LGU profile settings.' : 'LGU profile settings successfully saved.');
      fetchSettings();
    } catch (err: any) {
      alert(err.message || (language === 'fil' ? 'Nabigong i-save ang settings.' : 'Failed to save settings.'));
    } finally {
      setProfileSaving(false);
    }
  };

  // Logo file upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local validation
    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError(language === 'fil' ? 'Ang file ay dapat 2MB o mas mababa' : 'File must be 2MB or less');
      return;
    }

    const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!acceptedTypes.includes(file.type)) {
      setLogoUploadError(language === 'fil' ? 'PNG, JPG, o SVG lamang ang tinatanggap na format' : 'Only PNG, JPG, or SVG are accepted');
      return;
    }

    setLogoUploadError(null);
    setLogoUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lguId', data.lgu.id);

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || (language === 'fil' ? 'Nabigong i-upload ang logo.' : 'Failed to upload logo.'));
      }

      setLogoUrl(result.url);
      alert(language === 'fil' ? 'Matagumpay na na-upload at na-update ang LGU Seal Logo!' : 'LGU Seal Logo successfully uploaded and updated!');
      fetchSettings();
    } catch (err: any) {
      setLogoUploadError(err.message || (language === 'fil' ? 'Error sa pag-upload ng logo.' : 'Error uploading logo.'));
    } finally {
      setLogoUploading(false);
    }
  };

  // Edit Service Settings
  const startEditingService = (svc: any) => {
    setEditingServiceId(svc.id);
    setServiceFee(svc.baseFee);
    setServiceDays(svc.processingDays);
    setServiceActive(svc.isActive);
  };

  const handleServiceSave = async () => {
    if (!editingServiceId) return;
    setServiceSaving(true);
    try {
      await updateServiceTypeSettings(editingServiceId, {
        baseFee: serviceFee,
        processingDays: serviceDays,
        isActive: serviceActive
      });
      setEditingServiceId(null);
      fetchSettings();
    } catch (err: any) {
      alert(err.message || (language === 'fil' ? 'Nabigong i-save ang serbisyo.' : 'Failed to save service.'));
    } finally {
      setServiceSaving(false);
    }
  };

  // Invite LGU Staff Account
  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffInviting(true);
    setStaffInviteSuccess(false);
    try {
      await inviteStaffMember({
        fullName: staffName,
        email: staffEmail,
        phone: staffPhone || undefined,
        role: staffRole as any
      });
      setStaffInviteSuccess(true);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffRole('DEPARTMENT_OFFICER');
      fetchSettings();
    } catch (err: any) {
      alert(err.message || (language === 'fil' ? 'Nabigong imbitahan ang staff.' : 'Failed to invite staff.'));
    } finally {
      setStaffInviting(false);
    }
  };

  // Toggle activation status
  const handleToggleStaff = async (id: string) => {
    try {
      const res = await toggleStaffStatus(id);
      alert(language === 'fil' ? `Nai-update ang status ng account sa ${res.active ? 'Aktibo' : 'Hindi Aktibo'}.` : `Account status updated successfully to ${res.active ? 'Active' : 'Deactivated'}.`);
      fetchSettings();
    } catch (err: any) {
      alert(err.message || (language === 'fil' ? 'Hindi maaring palitan ang katayuan.' : 'Could not change status.'));
    }
  };

  // Update customized LGU email template
  const handleEmailTemplateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateSaving(true);
    setTemplateSuccess(false);
    try {
      await updateEmailTemplate(selectedTemplateType, templateSubject, templateBody);
      setTemplateSuccess(true);
      fetchSettings();
    } catch (err: any) {
      alert(err.message || (language === 'fil' ? 'Nabigong i-save ang email template.' : 'Failed to save email template.'));
    } finally {
      setTemplateSaving(false);
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
              onClick={fetchSettings}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              {t('adminRetryBtn')}
            </button>
          </div>
        </Alert>
      </div>
    );
  }

  // Get Initials for LGU Seal Placeholder
  const getLguInitials = () => {
    if (!lguName) return 'LGU';
    return lguName
      .split(' ')
      .filter(x => x.toLowerCase() !== 'ng' && x.toLowerCase() !== 'lungsod' && x.toLowerCase() !== 'city')
      .map(word => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('adminSettingsTitle')}</h1>
          <p className="text-sm text-slate-500 font-medium">{t('adminSettingsSub')}</p>
        </div>
        <button 
          onClick={fetchSettings}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t('adminRefresh')}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <RefreshCw className="h-8 w-8 text-slate-300 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium font-sans">{t('adminLoadingData')}</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* ─── TAB NAVIGATION SIDEBAR ────────────────────────────────────────── */}
          <div className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'profile' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building size={16} />
              <span>{t('adminTabProfile')}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'services' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Briefcase size={16} />
              <span>{t('adminTabServices')}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'staff' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users size={16} />
              <span>{t('adminTabStaff')}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('emails')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'emails' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Mail size={16} />
              <span>{t('adminTabEmails')}</span>
            </button>
          </div>

          {/* ─── TAB CONTENT AREA ──────────────────────────────────────────────── */}
          <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 md:p-8">
            
            {/* 1. LGU PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{t('adminProfileTitle')}</h2>
                  <p className="text-xs text-slate-400 font-medium">{t('adminProfileSub')}</p>
                </div>
                
                <hr className="border-slate-100" />

                {/* Logo Upload Panel */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  {/* Logo Preview */}
                  <div className="relative group h-24 w-24 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-800 text-2xl shadow-sm overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt={lguName} className="h-full w-full object-cover" />
                    ) : (
                      getLguInitials()
                    )}
                    {logoUploading && (
                      <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-white">
                        <RefreshCw size={18} className="animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <h4 className="font-extrabold text-slate-800 text-xs">{t('adminLogoUploadLabel')}</h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm">
                      {t('adminLogoUploadDesc')}
                    </p>
                    
                    <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        className="hidden" 
                        accept=".png,.jpg,.jpeg,.svg"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all"
                      >
                        <Upload size={12} />
                        <span>{t('adminUploadSealBtn')}</span>
                      </button>
                    </div>
                    {logoUploadError && (
                      <p className="text-[10px] font-semibold text-rose-600 pt-1">{logoUploadError}</p>
                    )}
                  </div>
                </div>

                {/* Form fields */}
                <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminLguNameLabel')}</label>
                    <input
                      type="text"
                      required
                      value={lguName}
                      onChange={e => setLguName(e.target.value)}
                      placeholder="e.g. Lungsod ng Maynila"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminMunicipalityLabel')}</label>
                    <input
                      type="text"
                      required
                      value={municipality}
                      onChange={e => setMunicipality(e.target.value)}
                      placeholder="e.g. Maynila"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminProvinceLabel')}</label>
                    <input
                      type="text"
                      required
                      value={province}
                      onChange={e => setProvince(e.target.value)}
                      placeholder="e.g. Metro Manila"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminThemeColorLabel')}</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={e => setPrimaryColor(e.target.value)}
                        className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        required
                        value={primaryColor}
                        onChange={e => setPrimaryColor(e.target.value)}
                        placeholder="#1a3c6e"
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminContactEmailLabel')}</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="contact@lgu.gov.ph"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminContactPhoneLabel')}</label>
                    <input
                      type="text"
                      required
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="e.g. +63 917 123 4567"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 text-right">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      {profileSaving ? t('adminSaving') : t('adminSaveProfileBtn')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. SERVICES TAB */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{t('adminServicesTitle')}</h2>
                  <p className="text-xs text-slate-400 font-medium">{t('adminServicesSub')}</p>
                </div>
                
                <hr className="border-slate-100" />

                {/* Services list table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase">
                        <th className="px-5 py-3.5">{t('adminColServiceName')}</th>
                        <th className="px-5 py-3.5">{t('adminColCategory')}</th>
                        <th className="px-5 py-3.5 text-center">{t('adminColProcessingDays')}</th>
                        <th className="px-5 py-3.5 text-center">{t('adminColStatus')}</th>
                        <th className="px-5 py-3.5 text-right">{t('adminColBaseFee')}</th>
                        <th className="px-5 py-3.5 text-right">{t('adminColAction')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {data?.serviceTypes?.map((svc: any) => {
                        const isEditing = editingServiceId === svc.id;

                        return (
                          <tr key={svc.id} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3.5 font-bold text-slate-800">{svc.name}</td>
                            <td className="px-5 py-3.5 text-xs text-slate-500 font-medium uppercase tracking-wider">{svc.category}</td>
                            
                            <td className="px-5 py-3.5 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min={1}
                                  value={serviceDays}
                                  onChange={e => setServiceDays(parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center text-xs"
                                />
                              ) : (
                                <span>{svc.processingDays} {t('adminDays')}</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  checked={serviceActive}
                                  onChange={e => setServiceActive(e.target.checked)}
                                  className="rounded border-slate-350 text-slate-900 focus:ring-slate-900 h-4 w-4"
                                />
                              ) : (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  svc.isActive 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                  {svc.isActive ? t('adminActive') : t('adminInactive')}
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right font-black text-slate-900">
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-slate-400">₱</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={serviceFee}
                                    onChange={e => setServiceFee(parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-right text-xs"
                                  />
                                </div>
                              ) : (
                                <span>₱{svc.baseFee.toLocaleString('fil-PH', { minimumFractionDigits: 2 })}</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={handleServiceSave}
                                    disabled={serviceSaving}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                  >
                                    {t('adminSaveBtn')}
                                  </button>
                                  <button
                                    onClick={() => setEditingServiceId(null)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-250 border border-slate-200 text-slate-700 rounded text-[10px] font-bold"
                                  >
                                    {t('adminCancelBtn')}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditingService(svc)}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                                >
                                  {t('adminEditBtn')}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. STAFF MANAGEMENT TAB */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{t('adminStaffTitle')}</h2>
                  <p className="text-xs text-slate-400 font-medium">{t('adminStaffSub')}</p>
                </div>
                
                <hr className="border-slate-100" />

                {/* Split list and Form layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left Column: Staff members list */}
                  <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-[10px] text-slate-500 uppercase">
                      {t('adminActiveStaffList')}
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                      {data?.staffMembers?.map((staff: any) => (
                        <div key={staff.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors">
                          <div className="space-y-0.5 truncate">
                            <h4 className="font-extrabold text-slate-800 text-xs truncate flex items-center gap-1.5">
                              {staff.fullName}
                              {staff.role === 'ADMIN' && <ShieldCheck size={12} className="text-violet-600" />}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{staff.email}</p>
                            <div className="flex gap-1.5 pt-0.5">
                              <span className="text-[9px] font-bold uppercase bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-slate-600">
                                {staff.role.replace('_', ' ')}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                staff.isVerified 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                {staff.isVerified ? t('adminActive') : 'Suspended'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Toggle active / suspend trigger */}
                          <div className="shrink-0">
                            <button
                              onClick={() => handleToggleStaff(staff.id)}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all shadow-xs"
                            >
                              {staff.isVerified ? t('adminDeactivateBtn') : t('adminActivateBtn')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Invite Form */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <Plus size={14} />
                      <span>{t('adminInviteStaffTitle')}</span>
                    </h4>

                    {staffInviteSuccess && (
                      <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-start gap-2 animate-fade-in">
                        <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
                        <div className="text-[10px] font-semibold leading-relaxed">
                          {t('adminInviteSuccessMsg')}
                        </div>
                      </Alert>
                    )}

                    <form onSubmit={handleInviteStaff} className="space-y-3 text-left">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminStaffNameLabel')}</label>
                        <input
                          type="text"
                          required
                          value={staffName}
                          onChange={e => setStaffName(e.target.value)}
                          placeholder="e.g. Juan dela Cruz"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminStaffEmailLabel')}</label>
                        <input
                          type="email"
                          required
                          value={staffEmail}
                          onChange={e => setStaffEmail(e.target.value)}
                          placeholder="staff@lgu.gov.ph"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminStaffPhoneLabel')}</label>
                        <input
                          type="text"
                          value={staffPhone}
                          onChange={e => setStaffPhone(e.target.value)}
                          placeholder="+63 917..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminStaffRoleLabel')}</label>
                        <select
                          value={staffRole}
                          onChange={e => setStaffRole(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="BARANGAY_CLERK">Barangay Clerk</option>
                          <option value="DEPARTMENT_OFFICER">Department Officer / Reviewer</option>
                          <option value="TREASURER">Treasurer / Cashier</option>
                          <option value="ADMIN">System Admin</option>
                          <option value="MAYOR">Mayor</option>
                        </select>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={staffInviting}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                          {staffInviting ? t('adminInviting') : t('adminInviteBtn')}
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            )}

            {/* 4. EMAIL TEMPLATES TAB */}
            {activeTab === 'emails' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{t('adminEmailsTitle')}</h2>
                  <p className="text-xs text-slate-400 font-medium">{t('adminEmailsSub')}</p>
                </div>
                
                <hr className="border-slate-100" />

                {templateSuccess && (
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <AlertTitle className="text-sm font-bold text-emerald-900 mb-1">{t('adminTemplateSuccessMsg')}</AlertTitle>
                      <AlertDescription className="text-xs font-semibold leading-relaxed">
                        Nai-save sa database. Awtomatikong gagamitin ang bagong template para sa mga susunod na ilalabas na dokumento.
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <form onSubmit={handleEmailTemplateSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminNotificationTypeLabel')}</label>
                      <select
                        value={selectedTemplateType}
                        onChange={e => setSelectedTemplateType(e.target.value)}
                        className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                      >
                        <option value="EMAIL">Document Release Notification (Email)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminEmailSubjectLabel')}</label>
                    <input
                      type="text"
                      required
                      value={templateSubject}
                      onChange={e => setTemplateSubject(e.target.value)}
                      placeholder="e.g. BayanServe — Inilabas na ang iyong {SERVICE_NAME}"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{t('adminEmailBodyLabel')}</label>
                      <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{t('adminSupportedPlaceholders')}</span>
                    </div>
                    <textarea
                      required
                      rows={14}
                      value={templateBody}
                      onChange={e => setTemplateBody(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Placeholder references panel */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <h5 className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider">{t('adminSupportedPlaceholders')}</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] font-semibold text-slate-500">
                      <div><code className="bg-slate-200 px-1 py-0.2 rounded font-bold text-slate-800">{`{NAME}`}</code>: Pangalan ng Citizen</div>
                      <div><code className="bg-slate-200 px-1 py-0.2 rounded font-bold text-slate-800">{`{TRACKING_NO}`}</code>: Tracking Number</div>
                      <div><code className="bg-slate-200 px-1 py-0.2 rounded font-bold text-slate-800">{`{SERVICE_NAME}`}</code>: Uri ng Serbisyo</div>
                      <div><code className="bg-slate-200 px-1 py-0.2 rounded font-bold text-slate-800">{`{DOWNLOAD_URL}`}</code>: Supabase PDF Link</div>
                      <div><code className="bg-slate-200 px-1 py-0.2 rounded font-bold text-slate-800">{`{VERIFY_URL}`}</code>: Secure Online Link</div>
                      <div><code className="bg-slate-200 px-1 py-0.2 rounded font-bold text-slate-800">{`{LGU_NAME}`}</code>: Pangalan ng LGU</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="submit"
                      disabled={templateSaving}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                    >
                      {templateSaving ? t('adminTemplateSaving') : t('adminSaveTemplateBtn')}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
