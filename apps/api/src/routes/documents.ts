import { Router } from 'express';
import multer from 'multer';
import { prisma } from '@bayanserve/db';
import { supabase } from '../utils/supabase';
import { publicRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Multer memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Strict 5MB file size limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tanging PDF, PNG, at JPG lamang ang mga pinapayagang format.'));
    }
  },
});

/**
 * POST /documents/upload
 * Multi-part upload for application requirements (Citizen / Staff authenticated).
 * Uploads file to Supabase Storage bucket 'application-documents'.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Mangyaring magpadala ng file na ia-upload.',
      });
    }

    const { originalname, buffer, mimetype } = req.file;
    const fileExtension = originalname.split('.').pop() || '';
    const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;

    // Upload to Supabase Storage bucket: application-documents
    const { error: uploadError } = await supabase.storage
      .from('application-documents')
      .upload(uniqueFilename, buffer, {
        contentType: mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Supabase Upload Failure]:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Hindi mai-save ang file sa cloud storage server.',
      });
    }

    // Get Public URL
    const { data: urlData } = supabase.storage
      .from('application-documents')
      .getPublicUrl(uniqueFilename);

    return res.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        filename: originalname,
        fileType: mimetype,
      },
      message: 'File matagumpay na na-upload!',
    });
  } catch (error: any) {
    console.error('[Upload API Failure]:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'May error sa pag-upload ng file.',
    });
  }
});

/**
 * GET /verify/:qr_token
 * Public QR Code document verification.
 * Returns document validity, LGU seal details, applicant metadata, and receipt references.
 */
router.get('/verify/:qr_token', publicRateLimiter, async (req, res) => {
  try {
    const { qr_token } = req.params;

    const issuedDoc = await prisma.issuedDocument.findUnique({
      where: { qrToken: qr_token },
      include: {
        lgu: {
          select: { name: true, municipality: true, province: true, logoUrl: true },
        },
        application: {
          include: {
            citizen: { select: { fullName: true } },
            serviceType: { select: { name: true } },
            payments: { where: { status: 'PAID' }, take: 1 },
          },
        },
        issuedByUser: {
          select: { fullName: true, role: true },
        },
      },
    });

    if (!issuedDoc) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'Hindi balido o pekeng QR code token. Walang rekord sa system.',
      });
    }

    if (issuedDoc.isRevoked) {
      return res.json({
        success: true,
        valid: false,
        data: {
          trackingNumber: issuedDoc.application.trackingNumber,
          documentType: issuedDoc.documentType,
          revokedAt: issuedDoc.issuedAt, // fallback field
        },
        message: 'Ang dokumentong ito ay binawi o ni-revoke na ng LGU Administration.',
      });
    }

    const paidRecord = issuedDoc.application.payments[0];

    return res.json({
      success: true,
      valid: true,
      data: {
        qrToken: issuedDoc.qrToken,
        trackingNumber: issuedDoc.application.trackingNumber,
        documentType: issuedDoc.documentType,
        fileUrl: issuedDoc.fileUrl,
        issuedAt: issuedDoc.issuedAt,
        holderName: issuedDoc.application.citizen.fullName,
        lgu: {
          name: issuedDoc.lgu.name,
          municipality: issuedDoc.lgu.municipality,
          province: issuedDoc.lgu.province,
          logoUrl: issuedDoc.lgu.logoUrl,
        },
        issuedBy: {
          name: issuedDoc.issuedByUser.fullName,
          role: issuedDoc.issuedByUser.role,
        },
        payment: paidRecord ? {
          amount: Number(paidRecord.amount).toFixed(2),
          orNumber: paidRecord.referenceNumber || '',
          paidAt: paidRecord.paidAt,
        } : null,
      },
      message: 'Ang dokumentong ito ay LEHITIMO at balido sa mga tala ng LGU.',
    });
  } catch (error) {
    console.error('[Verification Query Failure]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi matapos ang pag-verify dahil sa internal database failure.',
    });
  }
});

export default router;
