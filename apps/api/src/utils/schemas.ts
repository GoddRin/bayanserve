import { z } from 'zod';

// AUTH SCHEMAS
export const CitizenOTPRequestSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required'),
});

export const CitizenOTPVerifySchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const StaffLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// SERVICE SCHEMAS
export const ServiceQuerySchema = z.object({
  lgu_id: z.string().min(1, 'LGU ID is required'),
});

// APPLICATION SCHEMAS
export const ApplicationSubmitSchema = z.object({
  lguId: z.string().min(1, 'LGU ID is required'),
  serviceTypeId: z.string().min(1, 'Service Type ID is required'),
  formData: z.record(z.any()).default({}),
  documents: z
    .array(
      z.object({
        filename: z.string().min(1),
        fileUrl: z.string().url(),
        fileType: z.string().min(1),
      })
    )
    .default([]),
});

export const ApplicationTrackSchema = z.object({
  tracking: z.string().min(1, 'Tracking number is required'),
});

export const AdminApplicationFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT', 'APPROVED', 'REJECTED', 'RELEASED']).optional(),
  serviceType: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const UpdateApplicationStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT', 'APPROVED', 'REJECTED', 'RELEASED']),
  remarks: z.string().optional().or(z.literal('')),
});

// PAYMENT SCHEMAS
export const RecordPaymentSchema = z.object({
  application_id: z.string().min(1, 'Application ID is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  or_number: z.string().optional().or(z.literal('')),
  paid_at: z.string().datetime().optional(),
});

export const PaymentFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// SETTINGS SCHEMAS
export const LguProfileSchema = z.object({
  name: z.string().min(2).optional(),
  municipality: z.string().min(2).optional(),
  province: z.string().min(2).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().nullable().optional(),
});

export const ServiceTypeCreateSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  category: z.enum(['CLEARANCE', 'PERMIT', 'CERTIFICATE', 'COMPLAINT']),
  baseFee: z.coerce.number().nonnegative('Base fee cannot be negative'),
  processingDays: z.coerce.number().int().positive('Processing days must be positive'),
  requiredDocuments: z.array(z.string()).default([]),
});

export const ServiceTypeUpdateSchema = z.object({
  baseFee: z.coerce.number().nonnegative().optional(),
  processingDays: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  requiredDocuments: z.array(z.string()).optional(),
});

export const StaffInviteSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'TREASURER', 'ADMIN', 'MAYOR']),
});

export const StaffUpdateSchema = z.object({
  role: z.enum(['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'TREASURER', 'ADMIN', 'MAYOR']).optional(),
  isActive: z.boolean().optional(),
});
