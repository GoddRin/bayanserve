import { Router } from 'express';
import { prisma } from '@bayanserve/db';
import { authenticateJWT, requireRole } from '../middleware/auth';
import {
  ApplicationSubmitSchema,
  ApplicationTrackSchema,
  AdminApplicationFilterSchema,
  UpdateApplicationStatusSchema,
} from '../utils/schemas';
import { writeAuditLog } from '../utils/audit';
import { sendNotificationEmail } from '../utils/email';
import { generateDocument } from '../services/pdfGenerator';
import { supabase } from '../utils/supabase';

const router = Router();

/**
 * POST /applications
 * Submit an application (Citizen auth required).
 * Creates application + documents + initial history + pending payment if service fee > 0.
 */
router.post('/', authenticateJWT, requireRole(['CITIZEN']), async (req, res) => {
  try {
    const parse = ApplicationSubmitSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling input sa aplikasyon.',
      });
    }

    const { lguId, serviceTypeId, formData, documents } = parse.data;
    const citizenId = req.user!.id;

    // Fetch LGU to generate tracking prefix
    const lgu = await prisma.lgu.findUnique({
      where: { id: lguId },
    });

    if (!lgu) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang tinukoy na LGU.',
      });
    }

    // Fetch Service Type to assess fee
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
    });

    if (!serviceType) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang tinukoy na serbisyo.',
      });
    }

    // Format unique tracking number with loop collision guard
    const lguPrefix = (lgu.name.replace(/[^a-zA-Z]/g, '').substring(0, 3) || 'LGU').toUpperCase();
    const year = new Date().getFullYear();
    let trackingNumber = '';
    let isUnique = false;

    while (!isUnique) {
      const rand = Math.floor(100000 + Math.random() * 900000);
      trackingNumber = `${lguPrefix}-${year}-${rand}`;
      const existing = await prisma.application.findUnique({
        where: { trackingNumber },
      });
      if (!existing) isUnique = true;
    }

    const baseFee = Number(serviceType.baseFee);
    // Initial status determined by whether a payment is required
    const initialStatus = baseFee > 0 ? 'PENDING_PAYMENT' : 'SUBMITTED';

    // Create transactional record
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Application
      const application = await tx.application.create({
        data: {
          lguId,
          citizenId,
          serviceTypeId,
          trackingNumber,
          status: initialStatus,
          formData: formData || {},
        },
      });

      // 2. Add Documents
      if (documents && documents.length > 0) {
        await tx.applicationDocument.createMany({
          data: documents.map((doc) => ({
            applicationId: application.id,
            filename: doc.filename,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType,
          })),
        });
      }

      // 3. Add History logs
      await tx.applicationHistory.create({
        data: {
          applicationId: application.id,
          changedBy: citizenId,
          oldStatus: 'SUBMITTED',
          newStatus: initialStatus,
          remarks: 'Matagumpay na naisumite ang aplikasyon.',
        },
      });

      // 4. Create Payment row if base fee > 0 (counter CASH payment model)
      if (baseFee > 0) {
        await tx.payment.create({
          data: {
            applicationId: application.id,
            lguId,
            amount: baseFee,
            method: 'CASH',
            status: 'PENDING',
          },
        });
      }

      return application;
    });

    // Write Audit Log
    await writeAuditLog({
      lguId,
      userId: citizenId,
      action: 'APPLICATION_SUBMITTED',
      entityType: 'Application',
      entityId: result.id,
      ipAddress: req.ip,
      metadata: { trackingNumber, initialStatus, baseFee },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: result.id,
        trackingNumber: result.trackingNumber,
        status: result.status,
      },
      message: 'Matagumpay na naisumite ang aplikasyon!',
    });
  } catch (error) {
    console.error('[SubmitApplication Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Problema sa server habang isinusumite ang aplikasyon.',
    });
  }
});

/**
 * GET /applications/my
 * Returns the citizen's own submitted applications list (Citizen auth required).
 */
router.get('/my', authenticateJWT, requireRole(['CITIZEN']), async (req, res) => {
  try {
    const citizenId = req.user!.id;

    const applications = await prisma.application.findMany({
      where: { citizenId },
      include: {
        serviceType: {
          select: { name: true, category: true, baseFee: true },
        },
        payments: {
          select: { amount: true, status: true, paidAt: true, orNumber: true } as any, // fallback for any typescript typing issue
        },
        history: {
          orderBy: { changedAt: 'desc' },
          select: { newStatus: true, remarks: true, changedAt: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error('[GetMyApplications Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang iyong mga aplikasyon mula sa database.',
    });
  }
});

/**
 * GET /applications/:tracking
 * Public status tracking query. Scrubbed of PII.
 */
router.get('/:tracking', async (req, res) => {
  try {
    const parse = ApplicationTrackSchema.safeParse(req.params);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: 'Kailangan ang wastong tracking number.',
      });
    }

    const { tracking } = parse.data;

    const application = await prisma.application.findUnique({
      where: { trackingNumber: tracking },
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        submittedAt: true,
        serviceType: {
          select: { name: true },
        },
        history: {
          orderBy: { changedAt: 'asc' },
          select: {
            newStatus: true,
            remarks: true,
            changedAt: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang aplikasyon para sa tracking number na ito.',
      });
    }

    return res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error('[TrackApplication Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi ma-verify ang tracking details sa ngayon.',
    });
  }
});

/**
 * GET /admin/applications
 * Paginated application listing with filtering options (Staff auth required).
 */
router.get('/', authenticateJWT, requireRole(['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'TREASURER', 'ADMIN', 'MAYOR']), async (req, res) => {
  try {
    const parse = AdminApplicationFilterSchema.safeParse(req.query);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling filter parameters.',
      });
    }

    const { page, limit, status, serviceType, search, dateFrom, dateTo } = parse.data;
    const lguId = req.user!.lguId;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    // Build query filters
    const where: any = { lguId };

    if (status) {
      where.status = status;
    }
    if (serviceType) {
      where.serviceTypeId = serviceType;
    }
    if (dateFrom || dateTo) {
      where.submittedAt = {};
      if (dateFrom) where.submittedAt.gte = new Date(dateFrom);
      if (dateTo) where.submittedAt.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { citizen: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        include: {
          citizen: {
            select: { fullName: true, email: true },
          },
          serviceType: {
            select: { name: true, category: true },
          },
          assignedOfficer: {
            select: { fullName: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        applications,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[AdminGetApplications Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang listahan ng mga aplikasyon.',
    });
  }
});

/**
 * GET /admin/applications/:id
 * Full application details with history, citizen profile, and payment logs (Staff auth required).
 */
router.get('/:id', authenticateJWT, requireRole(['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'TREASURER', 'ADMIN', 'MAYOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const lguId = req.user!.lguId;

    const application = await prisma.application.findFirst({
      where: { id, lguId: lguId || undefined },
      include: {
        citizen: {
          select: { fullName: true, email: true, phone: true, address: true, barangay: true, nationalId: true },
        },
        serviceType: true,
        documents: true,
        history: {
          include: {
            changedByUser: {
              select: { fullName: true, role: true },
            },
          },
          orderBy: { changedAt: 'desc' },
        },
        payments: true,
        assignedOfficer: {
          select: { fullName: true },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang detalye ng aplikasyong ito.',
      });
    }

    return res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error('[AdminGetApplicationDetail Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error sa pagkuha ng detalye.',
    });
  }
});

/**
 * PATCH /admin/applications/:id/status
 * Updates status + remarks, logs history, sends email alert to applicant (Staff auth required).
 */
router.patch('/:id/status', authenticateJWT, requireRole(['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'TREASURER', 'ADMIN', 'MAYOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const lguId = req.user!.lguId;
    const staffId = req.user!.id;

    const parse = UpdateApplicationStatusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling input sa pagbabago ng status.',
      });
    }

    const { status, remarks } = parse.data;

    // Fetch existing application
    const application = await prisma.application.findFirst({
      where: { id, lguId: lguId || undefined },
      include: {
        citizen: { select: { fullName: true, email: true } },
        serviceType: { select: { name: true } },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang aplikasyon.',
      });
    }

    const oldStatus = application.status;

    // Transaction to update status and add history log
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: {
          status,
          assignedOfficerId: application.assignedOfficerId || staffId, // Auto-assign to staff who changes status
        },
      });

      await tx.applicationHistory.create({
        data: {
          applicationId: id,
          changedBy: staffId,
          oldStatus,
          newStatus: status,
          remarks,
        },
      });

      return app;
    });

    // Trigger asynchronous notification email
    const subject = `BayanServe Aplikasyon Update — ${application.trackingNumber}`;
    const emailHtml = `
      <h3>Magandang araw, ${application.citizen.fullName}!</h3>
      <p>Ang katayuan ng iyong aplikasyon para sa <strong>${application.serviceType.name}</strong> (Tracking No: ${application.trackingNumber}) ay pinalitan mula sa <strong>${oldStatus}</strong> tungo sa <strong>${status}</strong>.</p>
      <p><strong>Mga Puna / Remarks mula sa LGU Officer:</strong><br />
      <em>"${remarks}"</em></p>
      <br />
      <p>Maaari mong subaybayan ang iyong aplikasyon sa aming portal. Maraming salamat!</p>
    `;
    try {
      await sendNotificationEmail(application.citizen.email, subject, emailHtml);
    } catch (mailError) {
      console.error('[Notification Mail Error]: Failed to alert citizen', mailError);
    }

    // Write Audit Log
    await writeAuditLog({
      lguId: application.lguId,
      userId: staffId,
      action: 'APPLICATION_STATUS_UPDATED',
      entityType: 'Application',
      entityId: id,
      ipAddress: req.ip,
      metadata: { oldStatus, newStatus: status, remarks },
    });

    return res.json({
      success: true,
      data: updatedApplication,
      message: 'Katayuan ng aplikasyon ay matagumpay na binago.',
    });
  } catch (error) {
    console.error('[UpdateStatus Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi matapos ang pagbabago ng katayuan ng aplikasyon.',
    });
  }
});

/**
 * POST /admin/applications/:id/issue
 * Compiles a real PDF, registers an IssuedDocument with secure QR token, uploads it to Supabase, and emails a download link (Officer/Admin auth).
 */
router.post('/:id/issue', authenticateJWT, requireRole(['DEPARTMENT_OFFICER', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const lguId = req.user!.lguId;
    const officerId = req.user!.id;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const application = await prisma.application.findFirst({
      where: { id, lguId },
      include: {
        citizen: { select: { fullName: true, email: true, address: true } },
        serviceType: { select: { name: true } },
        payments: { where: { status: 'PAID' }, take: 1 },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang tinukoy na aplikasyon para sa iyong LGU.',
      });
    }

    // Fetch LGU Details for PDF generation
    const lgu = await prisma.lgu.findUnique({
      where: { id: lguId },
    });

    if (!lgu) {
      return res.status(500).json({
        success: false,
        error: 'May error sa pagkarga ng detalye ng LGU profile.',
      });
    }

    const staffUser = await prisma.user.findUnique({
      where: { id: officerId },
    });

    const qrToken = crypto.randomUUID(); // Secure unique QR token
    const paidRecord = application.payments[0];
    const feePaid = paidRecord ? Number(paidRecord.amount).toFixed(2) : '0.00';
    const orNumber = paidRecord?.referenceNumber || ''; // Or number recorded under referenceNumber in CashPayments

    // RENDER AND STREAM THE REAL PDF CERTIFICATE
    let pdfBuffer: Buffer;
    try {
      // Map service name to layout category
      let docType: 'CLEARANCE' | 'CEDULA' | 'BUSINESS_PERMIT' = 'CLEARANCE';
      const serviceNameLower = application.serviceType.name.toLowerCase();
      
      if (serviceNameLower.includes('clearance')) {
        docType = 'CLEARANCE';
      } else if (serviceNameLower.includes('cedula') || serviceNameLower.includes('tax') || serviceNameLower.includes('ctc')) {
        docType = 'CEDULA';
      } else if (serviceNameLower.includes('permit') || serviceNameLower.includes('business')) {
        docType = 'BUSINESS_PERMIT';
      }

      // Generate formatted Control Number
      const typeCode = docType === 'CLEARANCE' ? 'CLR' : docType === 'CEDULA' ? 'CTC' : 'BPR';
      const lguInitials = lgu.name
        .split(/\s+/)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 4);
      const currentYear = new Date().getFullYear().toString();
      const controlNumber = `${lguInitials}-${typeCode}-${currentYear}-${application.trackingNumber}`;

      // Extract form data securely
      const formData = (application.formData as Record<string, any>) || {};

      let docData: any;
      if (docType === 'CLEARANCE') {
        docData = {
          applicantName: application.citizen.fullName,
          age: Number(formData.age) || 21,
          civilStatus: String(formData.civilStatus || formData.civil_status || 'SINGLE'),
          address: String(formData.address || application.citizen.address || 'Sample LGU Address'),
          purpose: String(formData.purpose || 'CIVIC REQUIREMENT'),
          dateIssued: new Date(),
          orNumber: orNumber || undefined,
          feePaid: Number(feePaid) || 0,
          controlNumber,
          qrToken,
          signatoryName: staffUser?.fullName || 'HON. RENATO B. RAMOS',
          signatoryPosition: staffUser?.role === 'BARANGAY_CLERK' ? 'Barangay Secretary' : 'Punong Barangay',
        };
      } else if (docType === 'CEDULA') {
        docData = {
          applicantName: application.citizen.fullName,
          address: String(formData.address || application.citizen.address || 'Sample LGU Address'),
          ctcNumber: String(formData.ctcNumber || formData.ctc_number || `CTC-${currentYear}-${Math.floor(10000000 + Math.random() * 90000000)}`),
          amountPaid: Number(feePaid) || 50.00,
          dateIssued: new Date(),
          controlNumber,
          qrToken,
        };
      } else {
        docData = {
          businessName: String(formData.businessName || formData.business_name || 'SAMPLE ENTERPRISE'),
          ownerName: application.citizen.fullName,
          address: String(formData.address || application.citizen.address || 'Sample LGU Address'),
          natureOfBusiness: String(formData.natureOfBusiness || formData.nature_of_business || 'RETAIL STORE'),
          permitNumber: String(formData.permitNumber || formData.permit_number || `BP-${currentYear}-${Math.floor(100000 + Math.random() * 900000)}`),
          validityPeriod: `DECEMBER 31, ${currentYear}`,
          signatoryName: staffUser?.fullName || 'HON. MARIA ALICIA G. CASTRO',
          signatoryPosition: staffUser?.role === 'DEPARTMENT_OFFICER' ? 'Authorized Officer' : 'Municipal Mayor',
          controlNumber,
          qrToken,
        };
      }

      // Generate the official high-fidelity PDF document stream (isDraft = false since this is released)
      pdfBuffer = await generateDocument(docType, docData, lgu, false);
    } catch (pdfError: any) {
      console.error('[PDF Generation Failure]:', pdfError);
      return res.status(500).json({
        success: false,
        error: `Hindi magawa ang PDF certificate. Problem sa rendering engine: ${pdfError.message}`,
      });
    }

    // UPLOAD BUFFER TO SUPABASE STORAGE BUCKET: issued-documents
    const storagePath = `${application.trackingNumber}-${qrToken}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('issued-documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Supabase PDF Upload Failure]:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Hindi mai-upload ang dokumento sa storage system.',
      });
    }

    // GET PUBLIC DOWNLOAD URL
    const { data: urlData } = supabase.storage
      .from('issued-documents')
      .getPublicUrl(storagePath);

    const publicFileUrl = urlData.publicUrl;

    // SAVE ISSUED DOCUMENT AND UPDATE STATUS TO RELEASED
    const issuedDocument = await prisma.$transaction(async (tx) => {
      // 1. Create IssuedDocument record
      const doc = await tx.issuedDocument.create({
        data: {
          applicationId: id,
          lguId,
          documentType: application.serviceType.name,
          qrToken,
          fileUrl: publicFileUrl,
          issuedBy: officerId,
        },
      });

      // 2. Update status of application to RELEASED
      await tx.application.update({
        where: { id },
        data: { status: 'RELEASED' },
      });

      // 3. Log to history
      await tx.applicationHistory.create({
        data: {
          applicationId: id,
          changedBy: officerId,
          oldStatus: application.status,
          newStatus: 'RELEASED',
          remarks: 'Ang opisyal na dokumento ay matagumpay na inihanda at ipinalabas digital.',
        },
      });

      return doc;
    });

    // EMAIL THE DOWNLOAD LINK AND QR VERIFICATION LINK TO CITIZEN
    const verifyUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('5000', '3000') || 'http://localhost:3000'}/verify/${qrToken}`;
    const subject = `BayanServe — Ang iyong dokumento (${application.trackingNumber}) ay maaari nang i-download!`;
    const emailHtml = `
      <h3>Magandang araw, ${application.citizen.fullName}!</h3>
      <p>Ikinagagalak naming ipabatid na ang iyong aplikasyon para sa <strong>${application.serviceType.name}</strong> ay matagumpay na natapos at ang opisyal na dokumento ay nailabas na.</p>
      <p>Maaari mo itong i-download sa pamamagitan ng pag-click sa link sa ibaba:</p>
      <p style="margin:20px 0;">
        <a href="${publicFileUrl}" style="background-color:#10b981;color:#ffffff;padding:10px 20px;border-radius:5px;text-decoration:none;font-weight:bold;display:inline-block;">
          I-download ang PDF Certificate
        </a>
      </p>
      <p>Maaari rin itong i-verify ng kahit sino gamit ang digital secure verification link na ito: <a href="${verifyUrl}">${verifyUrl}</a></p>
      <br />
      <p>Maraming salamat sa paggamit ng BayanServe LGU Civic Services!</p>
    `;

    try {
      await sendNotificationEmail(application.citizen.email, subject, emailHtml);
    } catch (mailError) {
      console.error('[Notification Mail Error]: Failed to send released document email', mailError);
    }

    // Write Audit Log
    await writeAuditLog({
      lguId,
      userId: officerId,
      action: 'DOCUMENT_ISSUED_AND_RELEASED',
      entityType: 'IssuedDocument',
      entityId: issuedDocument.id,
      ipAddress: req.ip,
      metadata: { trackingNumber: application.trackingNumber, qrToken, publicFileUrl },
    });

    return res.json({
      success: true,
      data: {
        issuedDocumentId: issuedDocument.id,
        fileUrl: publicFileUrl,
        qrToken,
      },
      message: 'Matagumpay na inilabas ang opisyal na dokumento at naipadala sa citizen!',
    });
  } catch (error) {
    console.error('[IssueDocument Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Nagkaroon ng problema habang inilalabas ang dokumento.',
    });
  }
});

export default router;
