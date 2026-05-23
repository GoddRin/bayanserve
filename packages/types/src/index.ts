// ============================================================================
// BayanServe — Shared TypeScript Types
// Mirror of Prisma enums + lightweight DTOs for API/client boundaries
// ============================================================================

// ─── Enums (mirrored from Prisma for use outside DB layer) ───────────────────

export type UserRole =
  | 'CITIZEN'
  | 'BARANGAY_CLERK'
  | 'DEPARTMENT_OFFICER'
  | 'TREASURER'
  | 'ADMIN'
  | 'MAYOR';

export type ServiceCategory = 'CLEARANCE' | 'PERMIT' | 'CERTIFICATE' | 'COMPLAINT';

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PENDING_PAYMENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASED';

export type PaymentMethod = 'GCASH' | 'MAYA' | 'CASH' | 'BANK';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type NotificationType = 'SMS' | 'EMAIL' | 'IN_APP';

// ─── DTOs / Lightweight interfaces ──────────────────────────────────────────

export interface LguConfig {
  id: string;
  name: string;
  municipality: string;
  province: string;
  logoUrl: string | null;
  primaryColor: string;
  contactEmail: string;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  lguId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  nationalId: string | null;
  address: string | null;
  barangay: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
}

export interface ServiceTypeInfo {
  id: string;
  lguId: string;
  name: string;
  category: ServiceCategory;
  baseFee: number;
  processingDays: number;
  requiredDocuments: string[];
  isActive: boolean;
}

export interface ApplicationSummary {
  id: string;
  lguId: string;
  citizenId: string;
  serviceTypeId: string;
  trackingNumber: string;
  status: ApplicationStatus;
  formData: Record<string, unknown> | null;
  notes: string | null;
  submittedAt: Date;
  updatedAt: Date;
}

export interface PaymentInfo {
  id: string;
  applicationId: string;
  lguId: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber: string | null;
  paymongoPaymentId: string | null;
  status: PaymentStatus;
  paidAt: Date | null;
}

export interface IssuedDocumentInfo {
  id: string;
  applicationId: string;
  lguId: string;
  documentType: string;
  qrToken: string;
  fileUrl: string | null;
  issuedBy: string;
  issuedAt: Date;
  isRevoked: boolean;
}

export interface NotificationInfo {
  id: string;
  userId: string;
  lguId: string;
  type: NotificationType;
  message: string;
  isSent: boolean;
  sentAt: Date | null;
  errorMessage: string | null;
}

export interface AuditLogEntry {
  id: string;
  lguId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}
