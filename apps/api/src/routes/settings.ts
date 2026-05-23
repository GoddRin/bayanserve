import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@bayanserve/db';
import { authenticateJWT, requireRole } from '../middleware/auth';
import {
  LguProfileSchema,
  ServiceTypeCreateSchema,
  ServiceTypeUpdateSchema,
  StaffInviteSchema,
  StaffUpdateSchema,
} from '../utils/schemas';
import { writeAuditLog } from '../utils/audit';
import { sendStaffInviteEmail } from '../utils/email';

const router = Router();

// Apply auth middleware to all settings routes
router.use(authenticateJWT);

/**
 * GET /admin/lgu
 * Returns the current LGU profile configuration (Staff auth required).
 */
router.get('/lgu', requireRole(['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'TREASURER', 'ADMIN', 'MAYOR']), async (req, res) => {
  try {
    const lguId = req.user!.lguId;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const lgu = await prisma.lgu.findUnique({
      where: { id: lguId },
    });

    if (!lgu) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang profile ng iyong LGU.',
      });
    }

    return res.json({
      success: true,
      data: lgu,
    });
  } catch (error) {
    console.error('[GetLguProfile Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang LGU profile mula sa database.',
    });
  }
});

/**
 * PATCH /admin/lgu
 * Updates the LGU profile (Admin only).
 */
router.patch('/lgu', requireRole(['ADMIN']), async (req, res) => {
  try {
    const lguId = req.user!.lguId;
    const adminId = req.user!.id;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const parse = LguProfileSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling inputs sa pag-update ng LGU.',
      });
    }

    const updatedLgu = await prisma.lgu.update({
      where: { id: lguId },
      data: parse.data,
    });

    // Write Audit Log
    await writeAuditLog({
      lguId,
      userId: adminId,
      action: 'LGU_PROFILE_UPDATED',
      entityType: 'Lgu',
      entityId: lguId,
      ipAddress: req.ip,
      metadata: parse.data,
    });

    return res.json({
      success: true,
      data: updatedLgu,
      message: 'LGU profile ay matagumpay na binago!',
    });
  } catch (error) {
    console.error('[UpdateLguProfile Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi matapos ang pagbabago ng LGU profile.',
    });
  }
});

/**
 * GET /admin/services
 * Returns all configured service types (active and inactive) for this LGU (Staff auth required).
 */
router.get('/services', requireRole(['BARANGAY_CLERK', 'DEPARTMENT_OFFICER', 'TREASURER', 'ADMIN', 'MAYOR']), async (req, res) => {
  try {
    const lguId = req.user!.lguId;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const services = await prisma.serviceType.findMany({
      where: { lguId },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('[AdminGetServices Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang mga serbisyo ng LGU.',
    });
  }
});

/**
 * POST /admin/services
 * Creates a new service type for the LGU (Admin only).
 */
router.post('/services', requireRole(['ADMIN']), async (req, res) => {
  try {
    const lguId = req.user!.lguId;
    const adminId = req.user!.id;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const parse = ServiceTypeCreateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling inputs sa paggawa ng serbisyo.',
      });
    }

    const { name, category, baseFee, processingDays, requiredDocuments } = parse.data;

    // Check duplicate service name inside this LGU
    const duplicate = await prisma.serviceType.findFirst({
      where: { lguId, name },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'Mayroon nang nakalistang serbisyo na may ganitong pangalan.',
      });
    }

    const service = await prisma.serviceType.create({
      data: {
        lguId,
        name,
        category,
        baseFee,
        processingDays,
        requiredDocuments: requiredDocuments || [],
        isActive: true,
      },
    });

    // Write Audit Log
    await writeAuditLog({
      lguId,
      userId: adminId,
      action: 'SERVICE_TYPE_CREATED',
      entityType: 'ServiceType',
      entityId: service.id,
      ipAddress: req.ip,
      metadata: { name, category, baseFee, processingDays },
    });

    return res.status(201).json({
      success: true,
      data: service,
      message: 'Matagumpay na nagawa ang bagong serbisyo!',
    });
  } catch (error) {
    console.error('[CreateService Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi magawa ang bagong uri ng serbisyo.',
    });
  }
});

/**
 * PATCH /admin/services/:id
 * Updates base fee, target processing days, required fields list, or active status (Admin only).
 */
router.patch('/services/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const lguId = req.user!.lguId;
    const adminId = req.user!.id;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const parse = ServiceTypeUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling inputs sa pag-update.',
      });
    }

    const service = await prisma.serviceType.findFirst({
      where: { id, lguId },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang serbisyo.',
      });
    }

    const updatedService = await prisma.serviceType.update({
      where: { id },
      data: parse.data,
    });

    // Write Audit Log
    await writeAuditLog({
      lguId,
      userId: adminId,
      action: 'SERVICE_TYPE_UPDATED',
      entityType: 'ServiceType',
      entityId: id,
      ipAddress: req.ip,
      metadata: parse.data,
    });

    return res.json({
      success: true,
      data: updatedService,
      message: 'Ang uri ng serbisyo ay matagumpay na na-update!',
    });
  } catch (error) {
    console.error('[UpdateService Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi matapos ang pag-update sa serbisyo.',
    });
  }
});

/**
 * GET /admin/staff
 * Lists all staff users registered under this LGU (Admin only).
 */
router.get('/staff', requireRole(['ADMIN']), async (req, res) => {
  try {
    const lguId = req.user!.lguId;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const staffList = await prisma.user.findMany({
      where: {
        lguId,
        role: { not: 'CITIZEN' },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    console.error('[GetStaffList Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang listahan ng mga staff.',
    });
  }
});

/**
 * POST /admin/staff/invite
 * Invites a new LGU staff member: creates hashed password credentials, saves record, and emails temporary credentials (Admin only).
 */
router.post('/staff/invite', requireRole(['ADMIN']), async (req, res) => {
  try {
    const lguId = req.user!.lguId;
    const adminId = req.user!.id;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const parse = StaffInviteSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling invite inputs.',
      });
    }

    const { fullName, email, role } = parse.data;
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate account
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Ang email na ito ay rehistrado na sa sistema.',
      });
    }

    // Generate secure 8-character temporary password
    const tempPassword = Math.random().toString(36).substring(2, 10);
    // Hash password with 12 rounds of bcrypt
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newStaff = await prisma.user.create({
      data: {
        lguId,
        fullName,
        email: cleanEmail,
        password: hashedPassword,
        role,
        isVerified: true, // Auto-verified since administrative invite
      },
    });

    // Send credentials via Gmail SMTP nodemailer
    try {
      await sendStaffInviteEmail(cleanEmail, fullName, role, tempPassword);
    } catch (mailError) {
      console.error('[Nodemailer invite send error]:', mailError);
    }

    // Write Audit Log
    await writeAuditLog({
      lguId,
      userId: adminId,
      action: 'STAFF_INVITED',
      entityType: 'User',
      entityId: newStaff.id,
      ipAddress: req.ip,
      metadata: { fullName, email: cleanEmail, role },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newStaff.id,
        fullName: newStaff.fullName,
        email: newStaff.email,
        role: newStaff.role,
      },
      message: 'Ang imbitasyon ay matagumpay na naipadala sa email ng bagong staff!',
    });
  } catch (error) {
    console.error('[StaffInvite Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi matapos ang pag-imbita ng staff member.',
    });
  }
});

/**
 * PATCH /admin/staff/:id
 * Updates role or toggles verification (deactivation / activation) of a staff member (Admin only).
 */
router.patch('/staff/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const lguId = req.user!.lguId;
    const adminId = req.user!.id;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const parse = StaffUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling inputs sa staff update.',
      });
    }

    const staffMember = await prisma.user.findFirst({
      where: { id, lguId },
    });

    if (!staffMember) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang staff account na ito para sa inyong LGU.',
      });
    }

    if (staffMember.role === 'ADMIN' && adminId === id) {
      return res.status(400).json({
        success: false,
        error: 'Hindi mo maaaring de-aktibahin o baguhin ang iyong sariling Admin role.',
      });
    }

    const updateData: any = {};
    if (parse.data.role) updateData.role = parse.data.role;
    if (parse.data.isActive !== undefined) {
      // Map isActive parameter to isVerified field on the User model
      updateData.isVerified = parse.data.isActive;
    }

    const updatedStaff = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Write Audit Log
    await writeAuditLog({
      lguId,
      userId: adminId,
      action: 'STAFF_ACCOUNT_MODIFIED',
      entityType: 'User',
      entityId: id,
      ipAddress: req.ip,
      metadata: parse.data,
    });

    return res.json({
      success: true,
      data: {
        id: updatedStaff.id,
        fullName: updatedStaff.fullName,
        role: updatedStaff.role,
        isVerified: updatedStaff.isVerified,
      },
      message: 'Ang staff account ay matagumpay na binago!',
    });
  } catch (error) {
    console.error('[UpdateStaff Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi ma-update ang staff account.',
    });
  }
});

export default router;
