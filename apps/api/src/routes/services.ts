import { Router } from 'express';
import { prisma } from '@bayanserve/db';
import { ServiceQuerySchema } from '../utils/schemas';
import { publicRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Apply public rate limits
router.use(publicRateLimiter);

/**
 * GET /services?lgu_id=...
 * Lists all active service types configured for a particular LGU.
 */
router.get('/', async (req, res) => {
  try {
    const parse = ServiceQuerySchema.safeParse(req.query);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Kailangan ang LGU ID.',
      });
    }

    const { lgu_id } = parse.data;

    const services = await prisma.serviceType.findMany({
      where: {
        lguId: lgu_id,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('[GetServices Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang listahan ng mga serbisyo mula sa database.',
    });
  }
});

/**
 * GET /services/:id
 * Retrieves the full configuration detail for a specific service type (fees, processing days, and required document attachment fields).
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const service = await prisma.serviceType.findUnique({
      where: { id },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Hindi nahanap ang hinahanap na uri ng serbisyo.',
      });
    }

    return res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('[GetServiceDetail Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Problema sa server habang kinukuha ang detalye ng serbisyo.',
    });
  }
});

export default router;
