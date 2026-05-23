import crypto from 'crypto';
import QRCode from 'qrcode';

/**
 * Generates a cryptographically secure, unique UUID v4 token.
 * Used for official document verification tracking.
 */
export function generateQRToken(): string {
  return crypto.randomUUID();
}

/**
 * Generates a base64-encoded PNG Data URL of a QR code
 * that links directly to the LGU's public document verification page.
 * 
 * @param token The cryptographically secure document verification token.
 * @returns A Promise resolving to a base64 Data URL string ("data:image/png;base64,...").
 */
export async function generateQRCodeDataURL(token: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
    ?? process.env.NEXTAUTH_URL 
    ?? 'http://localhost:3000';

  const verificationUrl = `${baseUrl}/verify/${token}`;
  
  try {
    // Generate the QR Code as a base64 Data URL with high error correction and standard margin sizing
    const dataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 150,
    });
    return dataUrl;
  } catch (error) {
    console.error('[QR Generation Failure]:', error);
    throw new Error('Hindi magawa ang QR code para sa dokumento.');
  }
}
