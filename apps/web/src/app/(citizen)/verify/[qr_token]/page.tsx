'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '../../../providers';
import { verifyQrToken } from '../../../actions/citizen';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  User, 
  FileText, 
  Download, 
  MapPin,
  Clock,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function VerifyDocumentPage() {
  const params = useParams();
  const { t } = useLanguage();
  
  const qrToken = decodeURIComponent((params.qr_token as string) || '');
  
  const [verifiedDoc, setVerifiedDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVerification() {
      try {
        setLoading(true);
        const res = await verifyQrToken(qrToken);
        setVerifiedDoc(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (qrToken) {
      loadVerification();
    }
  }, [qrToken]);

  const isValid = verifiedDoc && !verifiedDoc.isRevoked;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-semibold">{t('verifying')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
            <span>{t('backHome')}</span>
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200/80 shadow-xl overflow-hidden bg-white">
        {/* Tricolor Government Accent Bar */}
        <div className="h-1.5 w-full flex">
          <div className="h-full bg-blue-600 w-1/3" />
          <div className="h-full bg-yellow-500 w-1/3" />
          <div className="h-full bg-red-600 w-1/3" />
        </div>

        {/* ─── CASE A: DOCUMENT IS VALID ──────────────────────────────────────── */}
        {isValid ? (
          <>
            <CardHeader className="text-center bg-slate-50/50 border-b border-slate-100 py-8">
              {/* LGU seal graphic */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner mb-4">
                <ShieldCheck className="h-10 w-10 animate-bounce" />
              </div>
              <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-3 py-1 rounded-full uppercase tracking-wider text-xs mx-auto mb-2">
                {t('verifyValidDoc')}
              </Badge>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t('verifyOfficialDoc')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                {t('verifyOfficialDocDesc')}
              </CardDescription>
            </CardHeader>

            <CardContent className="py-8 px-6 sm:px-8 space-y-6">
              <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 flex gap-3 text-xs text-emerald-800 items-start leading-relaxed">
                <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">{t('verifyAuthenticity')}</span>
                  {t('verifySuccessDesc')}
                </div>
              </div>

              {/* Document Specs Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
                
                <div className="grid grid-cols-3 p-4 bg-slate-50/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 col-span-1">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {t('verifyType')}
                  </span>
                  <span className="text-sm font-bold text-slate-800 col-span-2">
                    {verifiedDoc.documentType}
                  </span>
                </div>

                <div className="grid grid-cols-3 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 col-span-1">
                    <User className="h-4 w-4 text-slate-400" />
                    {t('verifyIssuedTo')}
                  </span>
                  <span className="text-sm font-bold text-slate-800 col-span-2">
                    {verifiedDoc.applicantName}
                  </span>
                </div>

                <div className="grid grid-cols-3 p-4 bg-slate-50/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 col-span-1">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {t('verifyIssueDate')}
                  </span>
                  <span className="text-sm font-bold text-slate-800 col-span-2">
                    {new Date(verifiedDoc.issuedAt).toLocaleDateString(t('languageLabel') === 'English' ? 'fil-PH' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-3 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 col-span-1">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {t('verifyLgu')}
                  </span>
                  <span className="text-sm font-bold text-slate-800 col-span-2">
                    {verifiedDoc.lguName}
                  </span>
                </div>

                <div className="grid grid-cols-3 p-4 bg-slate-50/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 col-span-1">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {t('verifyTokenId')}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 col-span-2 truncate">
                    {verifiedDoc.qrToken}
                  </span>
                </div>

              </div>
            </CardContent>

            <CardFooter className="bg-slate-50/30 border-t border-slate-100 py-5 flex flex-col sm:flex-row gap-3 justify-center">
              {verifiedDoc.fileUrl && (
                <a href={verifiedDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button className="w-full flex items-center gap-2 font-semibold shadow-sm">
                    <Download className="h-4 w-4" />
                    {t('verifyDownloadPdf')}
                  </Button>
                </a>
              )}
            </CardFooter>
          </>
        ) : (
          /* ─── CASE B: DOCUMENT IS INVALID / REVOKED ─────────────────────────── */
          <>
            <CardHeader className="text-center bg-rose-50/30 border-b border-rose-100 py-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner mb-4">
                <ShieldAlert className="h-10 w-10 animate-pulse" />
              </div>
              <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-3 py-1 rounded-full uppercase tracking-wider text-xs mx-auto mb-2">
                {t('verifyInvalidDoc')}
              </Badge>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t('verifyInvalidDocTitle')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                {t('verifyInvalidDocDesc')}
              </CardDescription>
            </CardHeader>

            <CardContent className="py-8 px-6 sm:px-8 space-y-6">
              <Alert variant="destructive" className="border-rose-200 bg-rose-50/50">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <AlertTitle className="font-bold text-rose-800">{t('verifyWarning')}</AlertTitle>
                <AlertDescription className="text-rose-700 text-xs mt-1 leading-relaxed">
                  {verifiedDoc?.isRevoked ? (
                    <span>{t('verifyRevokedDesc')}</span>
                  ) : (
                    <span>{t('verifyNotFoundDesc')}</span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-100 leading-relaxed">
                <span className="font-bold text-slate-700 block">{t('verifyWhatToDo')}</span>
                <ul className="list-disc pl-4 space-y-1">
                  <li>{t('verifyWhatToDo1')}</li>
                  <li>{t('verifyWhatToDo2')}</li>
                  <li>{t('verifyWhatToDo3')}</li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50/30 border-t border-slate-100 py-6 text-center">
              <Link href="/" className="w-full">
                <Button variant="outline" className="mx-auto border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 animate-fade-in w-full">
                  {t('verifyGoToCitizenPortal')}
                </Button>
              </Link>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
