'use server';

import { prisma } from '@bayanserve/db';
import { auth } from '@/auth';
import { ApplicationStatus } from '@prisma/client';

export interface LguConfig {
  id: string;
  name: string;
  municipality: string;
  province: string;
  logoUrl: string | null;
  primaryColor: string;
  contactEmail: string;
  contactPhone: string;
}

export interface ServiceTypeDto {
  id: string;
  name: string;
  category: string;
  baseFee: number;
  processingDays: number;
  requiredDocuments: string[];
  isActive: boolean;
}

// ─── 1. Get Active LGU Configuration ──────────────────────────────────────────
export async function getActiveLguConfig(): Promise<LguConfig> {
  const defaultLguName = process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME || 'Your Municipality';
  
  try {
    const lgu = await prisma.lgu.findFirst({
      where: {
        OR: [
          { name: defaultLguName },
          { municipality: defaultLguName }
        ]
      }
    });

    if (!lgu) {
      throw new Error(`LGU "${defaultLguName}" not found in database.`);
    }

    return {
      id: lgu.id,
      name: lgu.name,
      municipality: lgu.municipality,
      province: lgu.province,
      logoUrl: lgu.logoUrl || process.env.NEXT_PUBLIC_DEFAULT_LGU_LOGO_URL || null,
      primaryColor: lgu.primaryColor,
      contactEmail: lgu.contactEmail || '',
      contactPhone: lgu.contactPhone || '',
    };
  } catch (error) {
    console.error('Error fetching LGU configuration:', error);
    // Return white-labeled default config if DB fetch fails
    return {
      id: 'default-lgu',
      name: process.env.NEXT_PUBLIC_DEFAULT_LGU_NAME ?? 'BayanServe',
      municipality: process.env.NEXT_PUBLIC_DEFAULT_LGU_MUNICIPALITY ?? 'Your Municipality',
      province: process.env.NEXT_PUBLIC_DEFAULT_LGU_PROVINCE ?? 'Your Province',
      logoUrl: process.env.NEXT_PUBLIC_DEFAULT_LGU_LOGO_URL || null,
      primaryColor: process.env.NEXT_PUBLIC_DEFAULT_LGU_PRIMARY_COLOR ?? '#1a3c6e',
      contactEmail: process.env.NEXT_PUBLIC_DEFAULT_LGU_EMAIL ?? '',
      contactPhone: process.env.NEXT_PUBLIC_DEFAULT_LGU_PHONE ?? '',
    };
  }
}

// ─── 2. Get Service Types for Active LGU ──────────────────────────────────────
export async function getServiceTypes(): Promise<ServiceTypeDto[]> {
  try {
    const lguConfig = await getActiveLguConfig();
    const services = await prisma.serviceType.findMany({
      where: {
        lguId: lguConfig.id,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return services.map(svc => ({
      id: svc.id,
      name: svc.name,
      category: svc.category,
      baseFee: Number(svc.baseFee),
      processingDays: svc.processingDays,
      requiredDocuments: Array.isArray(svc.requiredDocuments) 
        ? (svc.requiredDocuments as string[])
        : JSON.parse(svc.requiredDocuments as string || '[]'),
      isActive: svc.isActive,
    }));
  } catch (error) {
    console.error('Error fetching service types:', error);
    return [];
  }
}

// ─── 3. Submit Civic Application ─────────────────────────────────────────────
interface DocumentUpload {
  filename: string;
  fileUrl: string;
  fileType: string;
}

interface SubmitApplicationPayload {
  serviceTypeId: string;
  trackingNumber: string;
  formData: any;
  documents: DocumentUpload[];
  amount: number;
}

export async function submitApplication(payload: SubmitApplicationPayload) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: 'Kailangan mong mag-login upang isumite ito (You must be logged in to apply)' };
    }

    const citizenId = session.user.id;
    const lguConfig = await getActiveLguConfig();

    // Determine status: PENDING_PAYMENT if fee > 0, SUBMITTED if free
    const initialStatus = payload.amount > 0 
      ? ApplicationStatus.PENDING_PAYMENT 
      : ApplicationStatus.SUBMITTED;

    // Use a transaction to ensure atomic application creation, document links, and history logs
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Application
      const application = await tx.application.create({
        data: {
          lguId: lguConfig.id,
          citizenId,
          serviceTypeId: payload.serviceTypeId,
          trackingNumber: payload.trackingNumber,
          status: initialStatus,
          formData: payload.formData,
        },
      });

      // 2. Link Documents
      if (payload.documents.length > 0) {
        await tx.applicationDocument.createMany({
          data: payload.documents.map(doc => ({
            applicationId: application.id,
            filename: doc.filename,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType,
          })),
        });
      }

      // 3. Create Application History
      await tx.applicationHistory.create({
        data: {
          applicationId: application.id,
          changedBy: citizenId,
          oldStatus: ApplicationStatus.SUBMITTED, // Dummy/start status
          newStatus: initialStatus,
          remarks: 'Naisumite ang application sa pamamagitan ng online portal (Application submitted online via portal)',
        },
      });

      // 4. Create initial pending payment record if fee > 0
      if (payload.amount > 0) {
        await tx.payment.create({
          data: {
            applicationId: application.id,
            lguId: lguConfig.id,
            amount: payload.amount,
            method: 'CASH', // default is cash/counter
            status: 'PENDING',
          },
        });
      }

      return application;
    });

    return { success: true, trackingNumber: result.trackingNumber };
  } catch (error) {
    console.error('Error submitting application:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Nabigong isumite ang application (Failed to submit application)' };
  }
}

// ─── 4. Track Application Status ──────────────────────────────────────────────
export interface HistoryLogDto {
  id: string;
  oldStatus: string;
  newStatus: string;
  remarks: string | null;
  changedAt: Date;
  changedByUserName: string;
}

export interface ApplicationTrackDto {
  id: string;
  trackingNumber: string;
  status: string;
  submittedAt: Date;
  serviceTypeName: string;
  processingDays: number;
  baseFee: number;
  citizenName: string;
  history: HistoryLogDto[];
}

export async function trackApplication(trackingNumber: string): Promise<ApplicationTrackDto | null> {
  try {
    const app = await prisma.application.findUnique({
      where: { trackingNumber },
      include: {
        citizen: true,
        serviceType: true,
        history: {
          include: {
            changedByUser: true,
          },
          orderBy: {
            changedAt: 'asc',
          },
        },
      },
    });

    if (!app) return null;

    return {
      id: app.id,
      trackingNumber: app.trackingNumber,
      status: app.status,
      submittedAt: app.submittedAt,
      serviceTypeName: app.serviceType.name,
      processingDays: app.serviceType.processingDays,
      baseFee: Number(app.serviceType.baseFee),
      citizenName: (app.formData as any)?.personal?.fullName || app.citizen.fullName,
      history: app.history.map(h => ({
        id: h.id,
        oldStatus: h.oldStatus,
        newStatus: h.newStatus,
        remarks: h.remarks,
        changedAt: h.changedAt,
        changedByUserName: h.changedByUser?.fullName || 'Sistem',
      })),
    };
  } catch (error) {
    console.error('Error tracking application:', error);
    return null;
  }
}

// ─── 5. Get Logged In Citizen Applications ──────────────────────────────────
export interface CitizenApplicationDto {
  id: string;
  trackingNumber: string;
  status: string;
  submittedAt: Date;
  serviceTypeName: string;
  baseFee: number;
  issuedDocumentUrl: string | null;
  issuedDocumentQr: string | null;
}

export async function getCitizenApplications(): Promise<CitizenApplicationDto[]> {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return [];
    }

    const citizenId = session.user.id;

    const apps = await prisma.application.findMany({
      where: { citizenId },
      include: {
        serviceType: true,
        issuedDocuments: {
          where: { isRevoked: false },
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return apps.map(app => ({
      id: app.id,
      trackingNumber: app.trackingNumber,
      status: app.status,
      submittedAt: app.submittedAt,
      serviceTypeName: app.serviceType.name,
      baseFee: Number(app.serviceType.baseFee),
      issuedDocumentUrl: app.issuedDocuments[0]?.fileUrl || null,
      issuedDocumentQr: app.issuedDocuments[0]?.qrToken || null,
    }));
  } catch (error) {
    console.error('Error fetching citizen applications:', error);
    return [];
  }
}

// ─── 6. Verify QR Token ──────────────────────────────────────────────────────
export interface VerifiedDocumentDto {
  id: string;
  documentType: string;
  qrToken: string;
  fileUrl: string | null;
  issuedAt: Date;
  applicantName: string;
  lguName: string;
  isRevoked: boolean;
}

export async function verifyQrToken(qrToken: string): Promise<VerifiedDocumentDto | null> {
  try {
    const doc = await prisma.issuedDocument.findUnique({
      where: { qrToken },
      include: {
        lgu: true,
        application: {
          include: {
            citizen: true,
          },
        },
      },
    });

    if (!doc) return null;

    return {
      id: doc.id,
      documentType: doc.documentType,
      qrToken: doc.qrToken,
      fileUrl: doc.fileUrl,
      issuedAt: doc.issuedAt,
      applicantName: (doc.application.formData as any)?.personal?.fullName || doc.application.citizen.fullName,
      lguName: doc.lgu.name,
      isRevoked: doc.isRevoked,
    };
  } catch (error) {
    console.error('Error verifying QR token:', error);
    return null;
  }
}

export async function getServiceTypeById(id: string): Promise<ServiceTypeDto | null> {
  try {
    const svc = await prisma.serviceType.findUnique({
      where: { id },
    });

    if (!svc) return null;

    return {
      id: svc.id,
      name: svc.name,
      category: svc.category,
      baseFee: Number(svc.baseFee),
      processingDays: svc.processingDays,
      requiredDocuments: Array.isArray(svc.requiredDocuments) 
        ? (svc.requiredDocuments as string[])
        : JSON.parse(svc.requiredDocuments as string || '[]'),
      isActive: svc.isActive,
    };
  } catch (error) {
    console.error('Error fetching service type by ID:', error);
    return null;
  }
}
