import { Router } from 'express';
import { prisma } from '@bayanserve/db';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { RecordPaymentSchema, PaymentFilterSchema } from '../utils/schemas';
import { writeAuditLog } from '../utils/audit';

const router = Router();

// Secure all treasurer routes
router.use(authenticateJWT, requireRole(['TREASURER', 'ADMIN']));

/**
 * POST /admin/payments/record
 * Treasurer manually records a counter CASH payment.
 * Moves associated application status from PENDING_PAYMENT to SUBMITTED.
 */
router.post('/record', async (req, res) => {
  try {
    const parse = RecordPaymentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling input sa pag-record ng bayad.',
      });
    }

    const { application_id, amount, or_number, paid_at } = parse.data;
    const lguId = req.user!.lguId;
    const treasurerId = req.user!.id;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    // Retrieve application
    const application = await prisma.application.findFirst({
      where: { id: application_id, lguId },
      include: { serviceType: true },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang aplikasyon sa talaan ng inyong LGU.',
      });
    }

    const paymentDate = paid_at ? new Date(paid_at) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find existing pending payment or create one
      const existingPayment = await tx.payment.findFirst({
        where: { applicationId: application_id, lguId },
      });

      let payment;
      if (existingPayment) {
        payment = await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount,
            status: 'PAID',
            referenceNumber: or_number,
            paidAt: paymentDate,
            method: 'CASH',
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            applicationId: application_id,
            lguId,
            amount,
            status: 'PAID',
            referenceNumber: or_number,
            paidAt: paymentDate,
            method: 'CASH',
          },
        });
      }

      // 2. Advance application status if it was PENDING_PAYMENT
      let updatedStatus = application.status;
      if (application.status === 'PENDING_PAYMENT') {
        updatedStatus = 'SUBMITTED';
        await tx.application.update({
          where: { id: application_id },
          data: { status: 'SUBMITTED' },
        });

        // 3. Log history
        await tx.applicationHistory.create({
          data: {
            applicationId: application_id,
            changedBy: treasurerId,
            oldStatus: 'PENDING_PAYMENT',
            newStatus: 'SUBMITTED',
            remarks: `Manwal na binayaran sa counter (CASH). OR No: ${or_number}.`,
          },
        });
      }

      return { payment, updatedStatus };
    });

    // Write Audit Log
    await writeAuditLog({
      lguId,
      userId: treasurerId,
      action: 'PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: result.payment.id,
      ipAddress: req.ip,
      metadata: { amount, or_number, application_id, updatedStatus: result.updatedStatus },
    });

    return res.status(201).json({
      success: true,
      data: result.payment,
      message: 'Ang bayad na CASH ay matagumpay na naitala!',
    });
  } catch (error) {
    console.error('[RecordPayment Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi matapos ang pag-record ng bayad sa database.',
    });
  }
});

/**
 * GET /admin/payments
 * Paginated list of payment logs, filterable by date range.
 */
router.get('/', async (req, res) => {
  try {
    const parse = PaymentFilterSchema.safeParse(req.query);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling query parameters.',
      });
    }

    const { page, limit, dateFrom, dateTo } = parse.data;
    const lguId = req.user!.lguId;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const where: any = { lguId };

    if (dateFrom || dateTo) {
      where.paidAt = {};
      if (dateFrom) where.paidAt.gte = new Date(dateFrom);
      if (dateTo) where.paidAt.lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          application: {
            include: {
              citizen: { select: { fullName: true } },
              serviceType: { select: { name: true } },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        payments,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[GetPayments List Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang listahan ng mga bayad.',
    });
  }
});

/**
 * GET /admin/payments/export
 * Exports LGU payment logs to CSV spreadsheet format.
 */
router.get('/export', async (req, res) => {
  try {
    const lguId = req.user!.lguId;

    if (!lguId) {
      return res.status(403).json({
        success: false,
        error: 'Ang iyong account ay walang nakatalagang LGU scope.',
      });
    }

    const payments = await prisma.payment.findMany({
      where: { lguId, status: 'PAID' },
      include: {
        application: {
          include: {
            citizen: { select: { fullName: true } },
            serviceType: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Construct CSV Header
    let csvContent = 'ID,Date Paid,Official Receipt (OR) No,Applicant Name,Service Type,Amount (PHP),Method\n';

    // Construct CSV Rows
    payments.forEach((p) => {
      const datePaid = p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-PH') : '';
      const orNo = p.referenceNumber || '';
      const applicant = p.application.citizen.fullName.replace(/"/g, '""');
      const service = p.application.serviceType.name.replace(/"/g, '""');
      const amount = Number(p.amount).toFixed(2);
      const method = p.method;

      csvContent += `"${p.id}","${datePaid}","${orNo}","${applicant}","${service}",${amount},"${method}"\n`;
    });

    const filename = `bayanserve_payments_${lguId}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('[ExportPayments Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Problema sa pag-compile ng CSV spreadsheet.',
    });
  }
});

export default router;
