'use server';

import { prisma } from '@bayanserve/db';
import { auth } from '@/auth';
import { ApplicationStatus, UserRole } from '@prisma/client';
import { sendCustomEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { generateDocument } from '../../services/pdfGenerator.compiled';

// ─── Supabase Storage Client ──────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

// ─── Helper for Safe Database Calls (Correction 1) ───────────────────────────
async function checkAuthAndGetStaff() {
  const session = await auth();
  if (!session || !session.user || !session.user.id || session.user.role === 'CITIZEN') {
    throw new Error('Walang pahintulot. Mangyaring mag-login bilang staff. (Unauthorized access. Please login as staff.)');
  }
  return session.user;
}

async function runPrisma<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (error) {
    console.error('Prisma operational failure:', error);
    throw new Error('Hindi ma-access ang database. Makipag-ugnayan sa inyong IT administrator.');
  }
}

// Helper to replace email placeholders
function parseEmailTemplate(
  body: string,
  replacements: {
    NAME: string;
    TRACKING_NO: string;
    SERVICE_NAME: string;
    AMOUNT?: string;
    DOWNLOAD_URL?: string;
    VERIFY_URL?: string;
    LGU_NAME: string;
    ROLE?: string;
    TEMP_PASSWORD?: string;
  }
): string {
  let parsed = body;
  for (const [key, value] of Object.entries(replacements)) {
    if (value !== undefined) {
      parsed = parsed.replace(new RegExp(`{${key}}`, 'g'), value);
    }
  }
  return parsed;
}

// Robust recursive JSON parser for formData — never throws, always returns a safe object
function parseFormData(val: any): Record<string, any> {
  if (!val) return {};
  let parsed = val;
  while (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      return {};
    }
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return parsed;
  }
  return {};
}

// ─── 1. Get Admin Applications List ───────────────────────────────────────────
export async function getAdminApplications(filters: {
  search?: string;
  status?: string;
  serviceTypeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const staff = await checkAuthAndGetStaff();
  
  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    // Construct filter predicates
    const whereClause: any = {
      lguId: lguId,
    };

    if (filters.status) {
      whereClause.status = filters.status as ApplicationStatus;
    }

    if (filters.serviceTypeId) {
      whereClause.serviceTypeId = filters.serviceTypeId;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.submittedAt = {};
      if (filters.startDate) {
        whereClause.submittedAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Extend to end of the day
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.submittedAt.lte = end;
      }
    }

    if (filters.search) {
      const searchStr = filters.search.trim();
      whereClause.OR = [
        { trackingNumber: { contains: searchStr, mode: 'insensitive' } },
        { citizen: { fullName: { contains: searchStr, mode: 'insensitive' } } },
      ];
    }

    // Role-based scoping (Clerks & Officers see applications, Admins see everything)
    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        citizen: true,
        serviceType: true,
        assignedOfficer: true,
        payments: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Query list of staff for bulk assignment dropdown in UI
    const staffMembers = await prisma.user.findMany({
      where: {
        lguId: lguId,
        role: { in: ['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'ADMIN'] },
      },
      select: {
        id: true,
        fullName: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });

    // Query service types list for filters
    const serviceTypes = await prisma.serviceType.findMany({
      where: { lguId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return {
      applications: applications.map(app => {
        // Parse formData to prefer form-submitted name over citizen profile name
        const fd = parseFormData(app.formData);
        const personal = fd?.personal || {};
        return {
          id: app.id,
          trackingNumber: app.trackingNumber,
          applicantName: personal.fullName || app.citizen.fullName,
          applicantEmail: personal.email || app.citizen.email,
          serviceTypeName: app.serviceType.name,
          serviceTypeId: app.serviceType.id,
          status: app.status,
          submittedAt: app.submittedAt,
          assignedOfficerName: app.assignedOfficer?.fullName || null,
          assignedOfficerId: app.assignedOfficerId,
          amount: Number(app.serviceType.baseFee),
          paymentStatus: app.payments[0]?.status || 'PENDING',
        };
      }),
      staffMembers,
      serviceTypes,
    };
  });
}

// ─── 2. Get Application Details by ID ──────────────────────────────────────────
export async function getApplicationDetails(id: string) {
  const staff = await checkAuthAndGetStaff();
  
  return runPrisma(async () => {
    const lguId = staff.lguId;
    
    const app = await prisma.application.findFirst({
      where: { id, lguId: lguId || undefined },
      include: {
        citizen: true,
        serviceType: true,
        assignedOfficer: true,
        documents: true,
        payments: true,
        issuedDocuments: {
          where: { isRevoked: false },
          orderBy: { issuedAt: 'desc' },
        },
        history: {
          include: {
            changedByUser: true,
          },
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!app) throw new Error('Hindi nahanap ang aplikasyon.');

    return {
      application: {
        id: app.id,
        trackingNumber: app.trackingNumber,
        status: app.status,
        submittedAt: app.submittedAt,
        notes: app.notes,
        formData: app.formData,
        serviceType: {
          id: app.serviceType.id,
          name: app.serviceType.name,
          category: app.serviceType.category,
          baseFee: Number(app.serviceType.baseFee),
          processingDays: app.serviceType.processingDays,
        },
        citizen: {
          id: app.citizen.id,
          fullName: app.citizen.fullName,
          email: app.citizen.email,
          phone: app.citizen.phone,
          nationalId: app.citizen.nationalId,
          address: app.citizen.address,
          barangay: app.citizen.barangay,
        },
        assignedOfficer: app.assignedOfficer ? {
          id: app.assignedOfficer.id,
          fullName: app.assignedOfficer.fullName,
          role: app.assignedOfficer.role,
        } : null,
        documents: app.documents.map(d => ({
          id: d.id,
          filename: d.filename,
          fileUrl: d.fileUrl,
          fileType: d.fileType,
        })),
        payments: app.payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          status: p.status,
          referenceNumber: p.referenceNumber,
          paidAt: p.paidAt,
        })),
        issuedDocuments: app.issuedDocuments.map(idoc => ({
          id: idoc.id,
          documentType: idoc.documentType,
          qrToken: idoc.qrToken,
          fileUrl: idoc.fileUrl,
          issuedAt: idoc.issuedAt,
        })),
        history: app.history.map(h => ({
          id: h.id,
          oldStatus: h.oldStatus,
          newStatus: h.newStatus,
          remarks: h.remarks,
          changedAt: h.changedAt,
          changedBy: h.changedByUser.fullName,
          changedByRole: h.changedByUser.role,
        })),
      },
    };
  });
}

// ─── 3. Bulk Assign applications to Officer ──────────────────────────────────
export async function bulkAssignApplications(applicationIds: string[], officerId: string) {
  const staff = await checkAuthAndGetStaff();

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    const officer = await prisma.user.findFirst({
      where: { id: officerId, lguId },
    });
    if (!officer) throw new Error('Hindi nahanap ang officer sa inyong LGU.');

    await prisma.$transaction(async (tx) => {
      for (const id of applicationIds) {
        const app = await tx.application.findFirst({ where: { id, lguId } });
        if (!app) continue;

        const oldStatus = app.status;
        const newStatus = oldStatus === 'SUBMITTED' ? 'UNDER_REVIEW' : oldStatus;

        await tx.application.update({
          where: { id },
          data: {
            assignedOfficerId: officerId,
            status: newStatus as ApplicationStatus,
          },
        });

        await tx.applicationHistory.create({
          data: {
            applicationId: id,
            changedBy: staff.id,
            oldStatus: oldStatus,
            newStatus: newStatus as ApplicationStatus,
            remarks: `Itinalaga kay officer ${officer.fullName}. (Assigned to officer ${officer.fullName}.)`,
          },
        });
      }
    });

    return { success: true };
  });
}

// ─── 4. Bulk Mark applications as Reviewed ────────────────────────────────────
export async function bulkMarkApplicationsAsReviewed(applicationIds: string[]) {
  const staff = await checkAuthAndGetStaff();

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    await prisma.$transaction(async (tx) => {
      for (const id of applicationIds) {
        const app = await tx.application.findFirst({ where: { id, lguId } });
        if (!app || app.status !== 'SUBMITTED') continue;

        await tx.application.update({
          where: { id },
          data: { status: 'UNDER_REVIEW' },
        });

        await tx.applicationHistory.create({
          data: {
            applicationId: id,
            changedBy: staff.id,
            oldStatus: 'SUBMITTED',
            newStatus: 'UNDER_REVIEW',
            remarks: 'Siniyasat at minarkahan bilang sinusuri. (Reviewed and marked as under review.)',
          },
        });
      }
    });

    return { success: true };
  });
}

// ─── 5. Update Application Status (Remarks mandatory) ───────────────────────
export async function updateApplicationStatus(applicationId: string, status: string, remarks: string) {
  const staff = await checkAuthAndGetStaff();
  const trimmedRemarks = remarks ? remarks.trim() : '';

  return runPrisma(async () => {
    const lguId = staff.lguId;
    
    const app = await prisma.application.findFirst({
      where: { id: applicationId, lguId: lguId || undefined },
    });
    if (!app) throw new Error('Hindi nahanap ang aplikasyon.');

    const oldStatus = app.status;
    const newStatus = status as ApplicationStatus;

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: { status: newStatus },
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: applicationId,
          changedBy: staff.id,
          oldStatus: oldStatus,
          newStatus: newStatus,
          remarks: trimmedRemarks || 'Walang ibinigay na remarks. (No remarks provided.)',
        },
      });
    });

    return { success: true };
  });
}

// ─── 6. Record Cash Payment (Treasurer role restricted) ─────────────────────
export async function recordCashPayment(
  applicationId: string,
  orNumber: string,
  amount: number,
  datePaid: string
) {
  const staff = await checkAuthAndGetStaff();
  
  if (staff.role !== 'TREASURER' && staff.role !== 'ADMIN') {
    throw new Error('Ang mga Treasurer o Admin lamang ang maaaring magtala ng bayad. (Only Treasurers or Admins can record payments.)');
  }

  const trimmedOr = orNumber ? orNumber.trim() : '';
  if (amount <= 0) throw new Error('Ang halaga ng bayad ay dapat higit sa zero. (Amount must be greater than zero.)');
  if (!datePaid) throw new Error('Kinakailangan ang petsa ng pagbabayad. (Payment date is required.)');

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    const app = await prisma.application.findFirst({
      where: { id: applicationId, lguId },
      include: { payments: true },
    });
    if (!app) throw new Error('Hindi nahanap ang aplikasyon.');

    const dateParsed = new Date(datePaid);
    const oldStatus = app.status;

    await prisma.$transaction(async (tx) => {
      // Create or update payments record
      if (app.payments.length > 0) {
        await tx.payment.updateMany({
          where: { applicationId: app.id },
          data: {
            amount: amount,
            method: 'CASH',
            referenceNumber: trimmedOr || null,
            status: 'PAID',
            paidAt: dateParsed,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            applicationId: app.id,
            lguId: lguId,
            amount: amount,
            method: 'CASH',
            referenceNumber: trimmedOr || null,
            status: 'PAID',
            paidAt: dateParsed,
          },
        });
      }

      // Transition application status if it was pending payment
      if (oldStatus === 'PENDING_PAYMENT') {
        await tx.application.update({
          where: { id: applicationId },
          data: { status: 'SUBMITTED' },
        });

        await tx.applicationHistory.create({
          data: {
            applicationId: applicationId,
            changedBy: staff.id,
            oldStatus: 'PENDING_PAYMENT',
            newStatus: 'SUBMITTED',
            remarks: `Natanggap ang cash payment. OR: ${trimmedOr}. Halaga: ₱${amount.toFixed(2)}. (Cash payment received. OR: ${trimmedOr}. Amount: ₱${amount.toFixed(2)}.)`,
          },
        });
      } else {
        // Just record history for the payment
        await tx.applicationHistory.create({
          data: {
            applicationId: applicationId,
            changedBy: staff.id,
            oldStatus: oldStatus,
            newStatus: oldStatus,
            remarks: `Naitabla ang cash payment. OR: ${trimmedOr}. Halaga: ₱${amount.toFixed(2)}. (Cash payment recorded. OR: ${trimmedOr}.)`,
          },
        });
      }
    });

    return { success: true };
  });
}

// ─── 7. Issue Document & Send PDF/QR/Email ────────────────────────────────────
export async function issueDocument(applicationId: string) {
  const staff = await checkAuthAndGetStaff();
  const lguId = staff.lguId;

  console.log(`\n[issueDocument] ============ START ============`);
  console.log(`[issueDocument] applicationId: ${applicationId}`);
  console.log(`[issueDocument] staff: ${staff.id} (${staff.role})`);
  console.log(`[issueDocument] lguId: ${lguId}`);

  if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

  // ── STEP 1: Application lookup ─────────────────────────────────────────────
  let app: any;
  try {
    console.log(`[issueDocument] STEP 1: Looking up application...`);
    app = await prisma.application.findFirst({
      where: { id: applicationId, lguId },
      include: {
        citizen: true,
        serviceType: true,
        lgu: true,
        payments: { where: { status: 'PAID' }, take: 1 },
      },
    });
    if (!app) {
      console.error(`[issueDocument] STEP 1 FAILED: Application not found for id=${applicationId}, lguId=${lguId}`);
      throw new Error('Hindi nahanap ang aplikasyon. (Application not found.)');
    }
    console.log(`[issueDocument] STEP 1 OK: Found app trackingNumber=${app.trackingNumber}, service=${app.serviceType.name}`);
    console.log(`[issueDocument]   - lgu: ${app.lgu?.name}, province: ${app.lgu?.province}`);
    console.log(`[issueDocument]   - payments found: ${app.payments.length}`);
  } catch (err: any) {
    console.error(`[issueDocument] STEP 1 ERROR (Prisma lookup):`, err);
    throw new Error(`STEP 1 - Application lookup failed: ${err.message}`);
  }

  const qrToken = crypto.randomUUID();
  const paidRecord = app.payments[0];
  const baseFee = app.serviceType?.baseFee ? Number(app.serviceType.baseFee) : 0;
  const feePaid = paidRecord ? Number(paidRecord.amount).toFixed(2) : baseFee.toFixed(2);
  const orNumber = paidRecord?.referenceNumber || '';
  console.log(`[issueDocument]   - qrToken: ${qrToken}, feePaid: ${feePaid}, orNumber: ${orNumber || 'none'}`);

  // ── STEP 2: PDF Generation ─────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    console.log(`[issueDocument] STEP 2: Generating PDF...`);

    let docType: 'CLEARANCE' | 'CEDULA' | 'BUSINESS_PERMIT' = 'CLEARANCE';
    const serviceNameLower = app.serviceType.name.toLowerCase();
    if (serviceNameLower.includes('clearance')) {
      docType = 'CLEARANCE';
    } else if (serviceNameLower.includes('cedula') || serviceNameLower.includes('tax') || serviceNameLower.includes('ctc')) {
      docType = 'CEDULA';
    } else if (serviceNameLower.includes('permit') || serviceNameLower.includes('business')) {
      docType = 'BUSINESS_PERMIT';
    }
    console.log(`[issueDocument]   - Resolved docType: ${docType}`);

    const typeCode = docType === 'CLEARANCE' ? 'CLR' : docType === 'CEDULA' ? 'CTC' : 'BPR';
    const lguInitials = app.lgu.name.split(/\s+/).map((w: string) => w.charAt(0)).join('').toUpperCase().slice(0, 4);
    const currentYear = new Date().getFullYear().toString();
    const controlNumber = `${lguInitials}-${typeCode}-${currentYear}-${app.trackingNumber}`;

    const formData = parseFormData(app.formData);
    const personal = formData?.personal || {};
    const details = formData?.details || {};
    const applicantName = personal.fullName || app.citizen.fullName;
    const applicantAddress = personal.address || app.citizen.address || 'Sample LGU Address';

    let docData: any;
    if (docType === 'CLEARANCE') {
      docData = {
        applicantName,
        age: Number(personal.age || formData.age) || 21,
        civilStatus: String(personal.civilStatus || formData.civilStatus || formData.civil_status || 'SINGLE'),
        address: String(applicantAddress),
        purpose: String(details.purpose || formData.purpose || 'CIVIC REQUIREMENT'),
        dateIssued: new Date(),
        orNumber: orNumber || undefined,
        feePaid: Number(feePaid) || 0,
        controlNumber,
        qrToken,
        signatoryName: staff.name || 'HON. RENATO B. RAMOS',
        signatoryPosition: staff.role === 'BARANGAY_CLERK' ? 'Barangay Secretary' : 'Punong Barangay',
      };
    } else if (docType === 'CEDULA') {
      docData = {
        applicantName,
        address: String(applicantAddress),
        ctcNumber: String(details.ctcNumber || formData.ctcNumber || formData.ctc_number || `CTC-${currentYear}-${Math.floor(10000000 + Math.random() * 90000000)}`),
        amountPaid: Number(feePaid) || 50.00,
        dateIssued: new Date(),
        controlNumber,
        qrToken,
      };
    } else {
      docData = {
        businessName: String(details.businessName || formData.businessName || formData.business_name || 'SAMPLE ENTERPRISE'),
        ownerName: applicantName,
        address: String(details.businessAddress || applicantAddress),
        natureOfBusiness: String(details.natureOfBusiness || formData.natureOfBusiness || formData.nature_of_business || 'RETAIL STORE'),
        permitNumber: String(formData.permitNumber || formData.permit_number || `BP-${currentYear}-${Math.floor(100000 + Math.random() * 900000)}`),
        validityPeriod: `DECEMBER 31, ${currentYear}`,
        signatoryName: staff.name || 'HON. MARIA ALICIA G. CASTRO',
        signatoryPosition: staff.role === 'DEPARTMENT_OFFICER' ? 'Authorized Officer' : 'Municipal Mayor',
        controlNumber,
        qrToken,
      };
    }

    console.log(`[issueDocument]   - docData:`, JSON.stringify(docData, null, 2));
    console.log(`[issueDocument]   - lgu object passed to generateDocument:`, JSON.stringify({ id: app.lgu.id, name: app.lgu.name, municipality: app.lgu.municipality, province: app.lgu.province, logoUrl: app.lgu.logoUrl }));

    // Use a child process to generate the PDF to bypass Next.js Turbopack bundling issues
    const { execFile } = require('child_process');
    const path = require('path');
    
    pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const workerPath = path.join(process.cwd(), 'src/services/pdfWorker.js');
      const child = execFile('node', [workerPath], {
        encoding: 'buffer',
        maxBuffer: 10 * 1024 * 1024 // 10MB
      }, (error: any, stdout: Buffer, stderr: Buffer) => {
        if (error) {
          const errMsg = stderr ? stderr.toString() : error.message;
          reject(new Error(errMsg));
          return;
        }
        resolve(stdout);
      });

      const input = JSON.stringify({
        type: docType,
        data: docData,
        lgu: app.lgu,
        isDraft: false
      });
      child.stdin?.write(input);
      child.stdin?.end();
    });

    console.log(`[issueDocument] STEP 2 OK: PDF generated, buffer size=${pdfBuffer.length} bytes`);
  } catch (pdfErr: any) {
    console.error(`[issueDocument] STEP 2 FAILED (PDF generation):`, pdfErr);
    console.error(`[issueDocument]   - error name: ${pdfErr?.name}`);
    console.error(`[issueDocument]   - error message: ${pdfErr?.message}`);
    console.error(`[issueDocument]   - error stack:`, pdfErr?.stack);
    throw new Error(`STEP 2 - PDF generation failed: ${pdfErr.message}`);
  }

  // ── STEP 3: Supabase Storage upload ───────────────────────────────────────
  console.log(`[issueDocument] STEP 3: Uploading PDF to Supabase Storage...`);
  console.log(`[issueDocument]   - SUPABASE_URL set: ${!!process.env.SUPABASE_URL}`);
  console.log(`[issueDocument]   - SUPABASE_SERVICE_KEY set: ${!!process.env.SUPABASE_SERVICE_KEY}`);

  if (!supabase) {
    console.error(`[issueDocument] STEP 3 FAILED: Supabase client is null — env vars missing`);
    throw new Error('STEP 3 - Supabase not configured. Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  }

  const storagePath = `${lguId}/${applicationId}/${app.trackingNumber}.pdf`;
  console.log(`[issueDocument]   - storagePath: ${storagePath}`);

  try {
    await supabase.storage.createBucket('issued-documents', { public: true });
    console.log(`[issueDocument]   - bucket ensured`);
  } catch (bucketErr: any) {
    // Bucket already exists is fine — log but continue
    console.log(`[issueDocument]   - bucket create note (likely already exists): ${bucketErr?.message}`);
  }

  let fileUrl: string;
  try {
    const { error: uploadError } = await supabase.storage
      .from('issued-documents')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      console.error(`[issueDocument] STEP 3 FAILED (Supabase upload):`, uploadError);
      throw new Error(`Supabase upload error: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from('issued-documents').getPublicUrl(storagePath);
    fileUrl = publicUrlData.publicUrl;
    console.log(`[issueDocument] STEP 3 OK: Uploaded to Supabase. Public URL: ${fileUrl}`);
  } catch (uploadErr: any) {
    console.error(`[issueDocument] STEP 3 ERROR:`, uploadErr);
    throw new Error(`STEP 3 - Supabase Storage upload failed: ${uploadErr.message}`);
  }

  // ── STEP 4: Database transaction (IssuedDocument + History + Status update) ─
  try {
    console.log(`[issueDocument] STEP 4: Running Prisma transaction (IssuedDocument + History + Status)...`);
    await prisma.$transaction(async (tx) => {

      console.log(`[issueDocument]   STEP 4a: Creating IssuedDocument record...`);
      await tx.issuedDocument.create({
        data: {
          applicationId: app.id,
          lguId: lguId,
          documentType: app.serviceType.name,
          qrToken: qrToken,
          fileUrl: fileUrl,
          issuedBy: staff.id,
        },
      });
      console.log(`[issueDocument]   STEP 4a OK`);

      console.log(`[issueDocument]   STEP 4b: Querying EmailTemplate...`);
      const template = await tx.emailTemplate.findFirst({ where: { lguId, type: 'EMAIL' } });
      console.log(`[issueDocument]   STEP 4b OK - template found: ${!!template}`);

      const nextauthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verifyUrl = `${nextauthUrl}/verify/${qrToken}`;

      let subject = `BayanServe — Inilabas na ang iyong ${app.serviceType.name}`;
      let body = `
<!DOCTYPE html>
<html lang="fil">
<head>
  <meta charset="UTF-8">
  <title>BayanServe</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
          
          <!-- LGU Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a3c6e 0%, #0f172a 100%); padding: 32px 40px; text-align: center;">
              <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">
                {LGU_NAME}
              </h2>
              <p style="margin: 4px 0 0; color: #e2e8f0; font-size: 13px; font-weight: 400; opacity: 0.9;">
                BayanServe LGU Civic Services
              </p>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; background-color: #ffffff;">
              <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
                📄 Handa na ang iyong Opisyal na Dokumento!
              </h3>
              <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Magandang araw, <strong>{NAME}</strong>!<br/><br/>
                Ang iyong opisyal na sertipiko o permit para sa <strong>{SERVICE_NAME}</strong> ay matagumpay na nailabas. Maaari mo na itong i-download at gamitin.
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                  🔐 <strong>Impormasyon sa Seguridad:</strong><br/>
                  Ang dokumentong ito ay naglalaman ng secure na QR Code. Maaari itong i-verify online sa pamamagitan ng link na ito:<br/><br/>
                  <a href="{VERIFY_URL}" style="color: #1a3c6e; text-decoration: underline;">{VERIFY_URL}</a>
                </p>
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{DOWNLOAD_URL}" style="background-color: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(16,185,129,0.2);">
                      I-download ang PDF Dokumento
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Compliance RA 10173 Unsubscribe & LGU Info Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #475569; font-size: 13px; font-weight: 600;">
                {LGU_NAME} Office of the Mayor
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.6; border-top: 1px dashed #cbd5e1; padding-top: 16px;">
                Para sa tulong, makipag-ugnayan sa:<br />
                Municipality of Peñablanca<br />
                (078) 304-0399 | Penablanca.LGU@negosyocenter.gov.ph
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();
      if (template) { subject = template.subject; body = template.body; }

      const targetEmail = (app.formData as any)?.personal?.email || (app.formData as any)?.email || app.citizen.email;
      const targetName = (app.formData as any)?.personal?.fullName || (app.formData as any)?.fullName || app.citizen.fullName;

      const finalSubject = parseEmailTemplate(subject, { NAME: targetName, TRACKING_NO: app.trackingNumber, SERVICE_NAME: app.serviceType.name, DOWNLOAD_URL: fileUrl, VERIFY_URL: verifyUrl, LGU_NAME: app.lgu.name });
      const finalBody = parseEmailTemplate(body, { NAME: targetName, TRACKING_NO: app.trackingNumber, SERVICE_NAME: app.serviceType.name, DOWNLOAD_URL: fileUrl, VERIFY_URL: verifyUrl, LGU_NAME: app.lgu.name });

      console.log(`[issueDocument]   STEP 4c: Sending notification email to ${targetEmail}...`);
      try {
        await sendCustomEmail(targetEmail, finalSubject, finalBody);
        console.log(`[issueDocument]   STEP 4c OK: Email sent`);
      } catch (mailErr: any) {
        console.error(`[issueDocument]   STEP 4c WARNING (email failed, non-fatal):`, mailErr?.message);
      }

      console.log(`[issueDocument]   STEP 4d: Creating ApplicationHistory record...`);
      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          changedBy: staff.id,
          oldStatus: app.status,
          newStatus: 'RELEASED',
          remarks: `Inilabas ang dokumento ni ${staff.name}. (Document issued by ${staff.name}.)`,
        },
      });
      console.log(`[issueDocument]   STEP 4d OK`);

      console.log(`[issueDocument]   STEP 4e: Updating application status to RELEASED...`);
      await tx.application.update({ where: { id: applicationId }, data: { status: 'RELEASED' } });
      console.log(`[issueDocument]   STEP 4e OK`);
    });
    console.log(`[issueDocument] STEP 4 OK: Transaction committed successfully`);
  } catch (txErr: any) {
    console.error(`[issueDocument] STEP 4 FAILED (Prisma transaction):`, txErr);
    console.error(`[issueDocument]   - error code: ${txErr?.code}`);
    console.error(`[issueDocument]   - error message: ${txErr?.message}`);
    console.error(`[issueDocument]   - error meta:`, txErr?.meta);
    throw new Error(`STEP 4 - Database transaction failed: ${txErr.message}`);
  }

  console.log(`[issueDocument] ============ SUCCESS ============\n`);
  return { success: true, downloadUrl: fileUrl, qrToken };
}

// ─── 8. Get Treasurer Payments List (TREASURER/ADMIN) ────────────────────────
export async function getPaymentsData(filters: {
  startDate?: string;
  endDate?: string;
}) {
  const staff = await checkAuthAndGetStaff();
  
  if (staff.role !== 'TREASURER' && staff.role !== 'ADMIN') {
    throw new Error('Wala kang pahintulot na tingnan ang listahan ng bayarin. (Unauthorized access.)');
  }

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    const paymentWhereClause: any = {
      lguId,
      status: 'PAID',
    };

    if (filters.startDate || filters.endDate) {
      paymentWhereClause.paidAt = {};
      if (filters.startDate) {
        paymentWhereClause.paidAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        paymentWhereClause.paidAt.lte = end;
      }
    }

    const payments = await prisma.payment.findMany({
      where: paymentWhereClause,
      include: {
        application: {
          include: {
            citizen: true,
            serviceType: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Sum total revenue
    const revenueSum = await prisma.payment.aggregate({
      where: {
        lguId,
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = Number(revenueSum._sum.amount || 0);

    return {
      payments: payments.map(p => {
        const formData = parseFormData(p.application.formData);
        const applicantName = formData?.personal?.fullName || p.application.citizen.fullName;

        return {
          id: p.id,
          orNumber: p.referenceNumber || 'N/A',
          trackingNumber: p.application.trackingNumber,
          applicantName,
          serviceTypeName: p.application.serviceType.name,
          amount: Number(p.amount),
          datePaid: p.paidAt,
          recordedBy: 'Cashier/Counter',
        };
      }),
      totalRevenue,
    };
  });
}

// ─── 9. Get Visual Analytics Data (Mayor + Treasurer view) ────────────────────
export async function getAnalyticsData() {
  const staff = await checkAuthAndGetStaff();
  
  if (staff.role !== 'MAYOR' && staff.role !== 'TREASURER' && staff.role !== 'ADMIN') {
    throw new Error('Wala kang pahintulot na tingnan ang analytics. (Unauthorized access.)');
  }

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // KPI count queries
    const totalThisMonth = await prisma.application.count({
      where: { lguId, submittedAt: { gte: startOfMonth } },
    });

    const approvedCount = await prisma.application.count({
      where: { lguId, status: { in: ['APPROVED', 'RELEASED'] } },
    });

    const pendingCount = await prisma.application.count({
      where: { lguId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'] } },
    });

    const revenueSum = await prisma.payment.aggregate({
      where: { lguId, status: 'PAID' },
      _sum: { amount: true },
    });
    const revenueCollected = Number(revenueSum._sum.amount || 0);

    // Bar chart data: Applications count per service type
    const serviceTypeBreakdown = await prisma.serviceType.findMany({
      where: { lguId },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    const barChartData = serviceTypeBreakdown.map(st => ({
      name: st.name,
      applications: st._count.applications,
    }));

    // Line chart data: Submissions last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const applicationsLast30Days = await prisma.application.findMany({
      where: { lguId, submittedAt: { gte: thirtyDaysAgo } },
      select: { submittedAt: true },
    });

    // Populate daily index maps for line chart
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' });
      dailyMap[str] = 0;
    }

    applicationsLast30Days.forEach(app => {
      const str = new Date(app.submittedAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' });
      if (dailyMap[str] !== undefined) {
        dailyMap[str]++;
      }
    });

    const lineChartData = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      applications: count,
    })).reverse();

    // Average processing time (days between submittedAt and updatedAt for APPROVED/RELEASED)
    const processedApplications = await prisma.application.findMany({
      where: {
        lguId,
        status: { in: ['APPROVED', 'RELEASED'] },
      },
      include: { serviceType: true },
    });

    const timesMap: Record<string, { totalDays: number; count: number }> = {};
    processedApplications.forEach(app => {
      const key = app.serviceType.name;
      const days = (app.updatedAt.getTime() - app.submittedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (!timesMap[key]) {
        timesMap[key] = { totalDays: 0, count: 0 };
      }
      timesMap[key].totalDays += Math.max(0.1, days);
      timesMap[key].count++;
    });

    const avgProcessingTime = Object.entries(timesMap).map(([name, stat]) => ({
      serviceTypeName: name,
      avgDays: parseFloat((stat.totalDays / stat.count).toFixed(1)),
      count: stat.count,
    }));

    // Barangay submission ranking
    const applicationsData = await prisma.application.findMany({
      where: { lguId },
      include: {
        citizen: {
          select: { barangay: true }
        }
      }
    });

    const barangayMap: Record<string, number> = {};
    applicationsData.forEach(app => {
      const parsed = parseFormData(app.formData);
      let brgy = parsed?.personal?.barangay || app.citizen?.barangay || 'Iba pa / Hindi tukoy';
      
      if (brgy !== 'Iba pa / Hindi tukoy') {
        // Normalize the barangay name
        brgy = brgy.trim();
        brgy = brgy.replace(/^(barangay|brgy\.|brgy)\s+/i, '');
        brgy = `Barangay ${brgy}`;
      }
      
      barangayMap[brgy] = (barangayMap[brgy] || 0) + 1;
    });

    const barangayRanking = Object.entries(barangayMap).map(([name, count]) => ({
      barangayName: name,
      submissions: count,
    })).sort((a, b) => b.submissions - a.submissions);

    return {
      kpis: {
        totalThisMonth,
        approvedCount,
        pendingCount,
        revenueCollected,
      },
      barChartData,
      lineChartData,
      avgProcessingTime,
      barangayRanking,
    };
  });
}

// ─── 10. Settings Mutations (ADMIN restriction) ─────────────────────────────
export async function updateLguSettings(data: {
  name: string;
  municipality: string;
  province: string;
  primaryColor: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
}) {
  const staff = await checkAuthAndGetStaff();
  if (staff.role !== 'ADMIN') throw new Error('Ang mga Admin lamang ang maaaring magbago ng settings.');

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    await prisma.lgu.update({
      where: { id: lguId },
      data: {
        name: data.name,
        municipality: data.municipality,
        province: data.province,
        primaryColor: data.primaryColor,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
      },
    });

    return { success: true };
  });
}

export async function getSettingsData() {
  const staff = await checkAuthAndGetStaff();
  if (staff.role !== 'ADMIN') throw new Error('Ang mga Admin lamang ang maaaring mag-access ng settings data.');

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    const lgu = await prisma.lgu.findUnique({
      where: { id: lguId }
    });

    const serviceTypes = await prisma.serviceType.findMany({
      where: { lguId },
      orderBy: { name: 'asc' },
    });

    const staffMembers = await prisma.user.findMany({
      where: { lguId, role: { not: 'CITIZEN' } },
      orderBy: { fullName: 'asc' },
    });

    const emailTemplates = await prisma.emailTemplate.findMany({
      where: { lguId },
    });

    return {
      lgu: {
        id: lgu?.id || '',
        name: lgu?.name || '',
        municipality: lgu?.municipality || '',
        province: lgu?.province || '',
        logoUrl: lgu?.logoUrl || '',
        primaryColor: lgu?.primaryColor || '#1a3c6e',
        contactEmail: lgu?.contactEmail || '',
        contactPhone: lgu?.contactPhone || '',
      },
      serviceTypes: serviceTypes.map(st => ({
        id: st.id,
        name: st.name,
        category: st.category,
        baseFee: Number(st.baseFee),
        processingDays: st.processingDays,
        isActive: st.isActive,
      })),
      staffMembers: staffMembers.map(s => ({
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        role: s.role,
        isVerified: s.isVerified,
      })),
      emailTemplates: emailTemplates.map(t => ({
        id: t.id,
        type: t.type,
        subject: t.subject,
        body: t.body,
      })),
    };
  });
}

export async function updateServiceTypeSettings(
  id: string,
  data: { baseFee: number; processingDays: number; isActive: boolean }
) {
  const staff = await checkAuthAndGetStaff();
  if (staff.role !== 'ADMIN') throw new Error('Pahintulot ay tinanggihan.');

  return runPrisma(async () => {
    await prisma.serviceType.update({
      where: { id },
      data: {
        baseFee: data.baseFee,
        processingDays: data.processingDays,
        isActive: data.isActive,
      },
    });

    return { success: true };
  });
}

// ─── 11. Staff Invitation & Credentials Email (Correction 4) ────────────────
export async function inviteStaffMember(data: {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
}) {
  const staff = await checkAuthAndGetStaff();
  if (staff.role !== 'ADMIN') throw new Error('Pahintulot ay tinanggihan.');

  const trimmedEmail = data.email.trim().toLowerCase();
  const trimmedName = data.fullName.trim();

  if (!trimmedName) throw new Error('Kinakailangan ang pangalan. (Full name is required.)');
  if (!trimmedEmail) throw new Error('Kinakailangan ang email address. (Email is required.)');

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    // Enforce that user email must be unique
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (existing) {
      throw new Error(`Ang email na ${trimmedEmail} ay mayroon nang kaugnay na account sa BayanServe.`);
    }

    // Generate temporary random alphanumeric password (Correction 4)
    const tempPassword = Math.random().toString(36).slice(-10);
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    const lgu = await prisma.lgu.findUnique({ where: { id: lguId } });
    const lguName = lgu?.name || 'BayanServe LGU';

    await prisma.$transaction(async (tx) => {
      // 1. Create staff user
      await tx.user.create({
        data: {
          fullName: trimmedName,
          email: trimmedEmail,
          phone: data.phone || null,
          role: data.role,
          password: hashedPassword,
          lguId: lguId,
          isVerified: true, // auto-verified staff members
          mustChangePassword: true, // force password change on first login
        },
      });

      // Send Credentials Email
      const nextauthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const loginUrl = `${nextauthUrl}/admin/login`;

      const subject = `Imbitasyon sa BayanServe Staff Portal — ${lguName}`;
      const body = `
<!DOCTYPE html>
<html lang="en">
<body style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif; background-color:#f1f5f9; padding:40px 0; margin:0;">
  <div style="max-width:540px; margin:0 auto; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.06); border:1px solid #e2e8f0;">
    <div style="background-color:#1a3c6e; padding:30px; text-align:center;">
      <h2 style="color:#ffffff; margin:0; font-size:22px; font-weight:700; letter-spacing:0.5px;">🏛️ ${lguName}</h2>
      <p style="color:#94a3b8; font-size:13px; margin:5px 0 0;">BayanServe Staff Invitation</p>
    </div>
    <div style="padding:40px; color:#334155; line-height:1.6;">
      <p style="margin:0 0 16px; font-size:16px;">Maligayang pagdating, <strong>${trimmedName}</strong>!</p>
      <p style="margin:0 0 24px; font-size:14px;">Ikaw ay opisyal na naimbitahan bilang <strong>${data.role}</strong> sa ${lguName} BayanServe staff portal.</p>
      
      <p style="margin:0 0 12px; font-size:14px; font-weight:bold; color:#1a3c6e;">Temporary Access Credentials:</p>
      <div style="background-color:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:20px; margin-bottom:24px;">
        <p style="margin:0 0 8px; font-size:13px;"><strong>Login Portal:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p style="margin:0 0 8px; font-size:13px;"><strong>Email:</strong> ${trimmedEmail}</p>
        <p style="margin:0; font-size:13px;"><strong>Temporary Password:</strong> <code style="background-color:#e2e8f0; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:14px;">${tempPassword}</code></p>
      </div>

      <p style="margin:0 0 24px; font-size:13px; color:#b91c1c; font-weight:bold;">⚠️ BOLD WARNING: Palitan agad ang iyong password pagkatapos mag-login.</p>
      <p style="margin:0; font-size:13px; color:#64748b;">Kung mayroon kayong katanungan, makipag-ugnayan sa inyong IT administrator sa ${lgu?.contactEmail || 'LGU Support'}.</p>
    </div>
    <div style="background-color:#f8fafc; padding:20px; text-align:center; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8;">
      ${lguName} &bull; Powered by BayanServe
    </div>
  </div>
</body>
</html>
      `.trim();

      try {
        await sendCustomEmail(trimmedEmail, subject, body);
      } catch (mailErr) {
        console.error('Failed to send welcome email with credentials:', mailErr);
        throw new Error('Nagawa ang account ngunit nabigong ipadala ang email ng credentials. Mangyaring subukan muli.');
      }
    });

    return { success: true };
  });
}

export async function toggleStaffStatus(id: string) {
  const staff = await checkAuthAndGetStaff();
  if (staff.role !== 'ADMIN') throw new Error('Pahintulot ay tinanggihan.');

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    const targetUser = await prisma.user.findFirst({ where: { id, lguId } });
    if (!targetUser) throw new Error('Staff hindi nahanap.');
    if (targetUser.id === staff.id) throw new Error('Hindi mo maaaring i-deactivate ang sarili mong account.');

    // We toggle the role to CITIZEN to deactivate staff privileges or simply disable password access.
    // Or we toggle isVerified as a toggle for active account status.
    const newStatus = !targetUser.isVerified;

    await prisma.user.update({
      where: { id },
      data: { isVerified: newStatus },
    });

    return { success: true, active: newStatus };
  });
}

// ─── 12. Email Templates customizer (Correction 6) ──────────────────────────
export async function updateEmailTemplate(type: string, subject: string, body: string) {
  const staff = await checkAuthAndGetStaff();
  if (staff.role !== 'ADMIN') throw new Error('Pahintulot ay tinanggihan.');

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();

  if (!trimmedSubject) throw new Error('Kinakailangan ang subject. (Subject is required.)');
  if (!trimmedBody) throw new Error('Kinakailangan ang template body. (Body is required.)');

  return runPrisma(async () => {
    const lguId = staff.lguId;
    if (!lguId) throw new Error('Hindi nakatali ang iyong account sa isang LGU.');

    await prisma.emailTemplate.upsert({
      where: {
        lguId_type: {
          lguId,
          type,
        },
      },
      update: {
        subject: trimmedSubject,
        body: trimmedBody,
      },
      create: {
        lguId,
        type,
        subject: trimmedSubject,
        body: trimmedBody,
      },
    });

    return { success: true };
  });
}

// ─── 13. Change Staff Password (First-login or voluntary) ───────────────────
export async function changeStaffPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === 'CITIZEN') {
    throw new Error('Walang pahintulot. (Unauthorized.)');
  }

  const trimmedCurrent = data.currentPassword.trim();
  const trimmedNew = data.newPassword.trim();

  if (!trimmedCurrent) throw new Error('Kinakailangan ang kasalukuyang password. (Current password is required.)');
  if (!trimmedNew) throw new Error('Kinakailangan ang bagong password. (New password is required.)');
  if (trimmedNew.length < 8) throw new Error('Ang bagong password ay dapat hindi bababa sa 8 characters. (Password must be at least 8 characters.)');
  if (trimmedCurrent === trimmedNew) throw new Error('Ang bagong password ay hindi maaaring kapareho ng lumang password. (New password must be different.)');

  return runPrisma(async () => {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      throw new Error('Hindi nahanap ang account o walang password na naka-set. (Account not found or no password set.)');
    }

    const isCurrentValid = await bcrypt.compare(trimmedCurrent, user.password);
    if (!isCurrentValid) {
      throw new Error('Mali ang kasalukuyang password. (Current password is incorrect.)');
    }

    const hashedNewPassword = await bcrypt.hash(trimmedNew, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
      },
    });

    return { success: true };
  });
}
