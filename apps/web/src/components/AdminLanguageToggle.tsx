'use client';

import React from 'react';
import { useLanguage } from '@/app/providers';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminLanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fil' : 'en');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-600 h-9 transition-colors shrink-0"
    >
      <Globe className="h-4 w-4" />
      <span className="font-bold text-xs">{t('languageLabel')}</span>
    </Button>
  );
}
