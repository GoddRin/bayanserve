import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { prisma } from '@bayanserve/db';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const defaultLguName = process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME ?? 'BayanServe';
  try {
    const lgu = await prisma.lgu.findFirst({
      where: {
        OR: [
          { name: defaultLguName },
          { municipality: defaultLguName }
        ]
      }
    });
    const lguName = lgu?.name ?? defaultLguName;
    return {
      title: `${lguName} BayanServe — Online Civic Services`,
      description: `Online civic services portal for ${lguName}. Apply for clearances, permits, and certificates conveniently.`,
    };
  } catch (e) {
    return {
      title: `${defaultLguName} BayanServe — Online Civic Services`,
      description: `Online civic services portal for ${defaultLguName}. Apply for clearances, permits, and certificates conveniently.`,
    };
  }
}

function hexToHsl(hex: string): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let primaryColorHsl = hexToHsl(process.env.NEXT_PUBLIC_DEFAULT_LGU_PRIMARY_COLOR ?? '#1a3c6e');
  
  try {
    const defaultLguName = process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME ?? 'BayanServe';
    const lgu = await prisma.lgu.findFirst({
      where: {
        OR: [
          { name: defaultLguName },
          { municipality: defaultLguName }
        ]
      }
    });
    
    if (lgu && lgu.primaryColor) {
      primaryColorHsl = hexToHsl(lgu.primaryColor);
    }
  } catch (error) {
    console.error('Error fetching LGU configuration in root layout:', error);
  }

  return (
    <html lang="en" className="h-full">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --primary: ${primaryColorHsl};
            --ring: ${primaryColorHsl};
          }
        `}} />
      </head>
      <body className={`${inter.className} flex min-h-full flex-col bg-slate-50 text-slate-900`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
