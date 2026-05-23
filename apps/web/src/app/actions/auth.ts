'use server';

import { prisma } from '@bayanserve/db';
import { signIn } from '@/auth';
import { sendOTPEmail } from '@/lib/email';
import { AuthError } from 'next-auth';

function isRedirectError(error: any): boolean {
  return (
    error &&
    typeof error === 'object' &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT;')
  );
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isPhilippinePhone(value: string): boolean {
  // Matches +639XXXXXXXXX or 09XXXXXXXXX
  return /^(\+63|0)9\d{9}$/.test(value);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ─── Request OTP ─────────────────────────────────────────────────────────────

export async function requestOTP(
  identifier: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = identifier.trim();

  if (!trimmed) {
    return { success: false, error: 'Please enter your email or phone number.' };
  }

  const isPhone = isPhilippinePhone(trimmed);
  const isEmailAddr = isEmail(trimmed);

  if (!isPhone && !isEmailAddr) {
    return {
      success: false,
      error: 'Please enter a valid email or Philippine mobile number (+63 or 09 format).',
    };
  }

  // Normalize phone: convert 09... to +639...
  const normalizedIdentifier = isPhone
    ? trimmed.startsWith('0')
      ? `+63${trimmed.slice(1)}`
      : trimmed
    : trimmed.toLowerCase();

  // Find or create citizen user
  let user = await prisma.user.findFirst({
    where: isEmailAddr
      ? { email: normalizedIdentifier }
      : { phone: normalizedIdentifier },
  });

  if (!user) {
    // Auto-create citizen accounts on first OTP request
    // Derive a readable display name from the email local-part:
    // e.g. "juan.dela.cruz@gmail.com" → "Juan Dela Cruz"
    // e.g. "maria_santos@yahoo.com" → "Maria Santos"
    let fullName = 'Citizen';
    if (isEmailAddr) {
      const localPart = normalizedIdentifier.split('@')[0];
      fullName = localPart
        .replace(/[._\-]+/g, ' ')          // replace separators with spaces
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ') || 'Citizen';
    }

    user = await prisma.user.create({
      data: {
        fullName,
        email: isEmailAddr ? normalizedIdentifier : `${normalizedIdentifier.replace('+', '')}@phone.bayanserve.local`,
        phone: isPhone ? normalizedIdentifier : null,
        role: 'CITIZEN',
      },
    });
  }

  // Prevent staff users from using OTP login
  if (user.role !== 'CITIZEN') {
    return {
      success: false,
      error: 'Staff accounts must use the admin login page.',
    };
  }

  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: otp, otpExpiresAt },
  });

  // Send OTP via email
  if (isEmailAddr) {
    try {
      await sendOTPEmail(normalizedIdentifier, otp, user.fullName);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return { success: false, error: 'Failed to send verification code. Please try again.' };
    }
  } else {
    // For phone-based OTP: in production, integrate SMS gateway (Semaphore, Globe Labs, etc.)
    // For now, log to console in development
    console.log(`[DEV] OTP for ${normalizedIdentifier}: ${otp}`);
  }

  return { success: true };
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────

export async function verifyOTP(
  identifier: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = identifier.trim();
  const trimmedOtp = otp.trim();

  if (!trimmed || !trimmedOtp) {
    return { success: false, error: 'Missing identifier or OTP code.' };
  }

  if (trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
    return { success: false, error: 'Please enter a valid 6-digit code.' };
  }

  // Normalize identifier
  const isPhone = isPhilippinePhone(trimmed);
  const normalizedIdentifier = isPhone
    ? trimmed.startsWith('0')
      ? `+63${trimmed.slice(1)}`
      : trimmed
    : trimmed.toLowerCase();

  try {
    await signIn('citizen-otp', {
      identifier: normalizedIdentifier,
      otp: trimmedOtp,
      redirectTo: '/',
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Invalid or expired verification code.' };
    }
    if (isRedirectError(error)) {
      return { success: true };
    }
    // Re-throw other errors
    throw error;
  }
}

// ─── Staff role → redirect path mapping ──────────────────────────────────────

export async function getStaffRedirectPath(role: string): Promise<string> {
  switch (role) {
    case 'BARANGAY_CLERK':
      return '/admin/applications';
    case 'TREASURER':
      return '/admin/payments';
    case 'MAYOR':
      return '/admin/analytics';
    case 'ADMIN':
      return '/admin/settings';
    case 'DEPARTMENT_OFFICER':
      return '/admin/applications';
    default:
      return '/admin';
  }
}
