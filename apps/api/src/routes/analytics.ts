import { Router } from 'express';
import { prisma } from '@bayanserve/db';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Scope analytics only to managers: Mayors, Admins, or Department Officers
router.use(authenticateJWT, requireRole(['MAYOR', 'ADMIN', 'DEPARTMENT_OFFICER']));

/**
 * GET /admin/analytics/summary
 * Returns total KPI summaries: application counts by state and total revenue this month.
 */
router.get('/summary', async (req, res) => {
  try {
    const lguId = req.user!.lguId;
    if (!lguId) {
      return res.status(403).json({ success: false, error: 'No LGU scoped to user.' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, approved, pending, revenueResult] = await Promise.all([
      // Total applications
      prisma.application.count({
        where: { lguId },
      }),
      // Approved or Released applications
      prisma.application.count({
        where: {
          lguId,
          status: { in: ['APPROVED', 'RELEASED'] },
        },
      }),
      // Pending applications under review
      prisma.application.count({
        where: {
          lguId,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_PAYMENT'] },
        },
      }),
      // Sum of CASH revenue this month
      prisma.payment.aggregate({
        where: {
          lguId,
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const revenueThisMonth = Number(revenueResult._sum.amount || 0);

    return res.json({
      success: true,
      data: {
        totalApplications: total,
        approvedApplications: approved,
        pendingApplications: pending,
        revenueThisMonth,
      },
    });
  } catch (error) {
    console.error('[AnalyticsSummary Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang buod ng analytics mula sa database.',
    });
  }
});

/**
 * GET /admin/analytics/trends
 * Aggregates daily application submission counts for the last 30 calendar days.
 */
router.get('/trends', async (req, res) => {
  try {
    const lguId = req.user!.lguId;
    if (!lguId) {
      return res.status(403).json({ success: false, error: 'No LGU scoped to user.' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Fetch all submissions from past 30 days
    const applications = await prisma.application.findMany({
      where: {
        lguId,
        submittedAt: { gte: thirtyDaysAgo },
      },
      select: { submittedAt: true },
    });

    // Populate standard 30-day map to guarantee dates with 0 counts appear
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = 0;
    }

    // Accumulate actual record dates
    applications.forEach((app) => {
      const dateStr = new Date(app.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      if (dateStr in dailyMap) {
        dailyMap[dateStr]++;
      }
    });

    // Transform into chronological array (reverse loop so dates go left-to-right)
    const trends = Object.keys(dailyMap)
      .map((date) => ({ date, count: dailyMap[date] }))
      .reverse();

    return res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error('[AnalyticsTrends Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang datus ng trend ng mga aplikasyon.',
    });
  }
});

/**
 * GET /admin/analytics/by-service
 * Outputs total applications count and average processing days grouped per LGU Service Type.
 */
router.get('/by-service', async (req, res) => {
  try {
    const lguId = req.user!.lguId;
    if (!lguId) {
      return res.status(403).json({ success: false, error: 'No LGU scoped to user.' });
    }

    // Fetch active LGU services
    const serviceTypes = await prisma.serviceType.findMany({
      where: { lguId },
      include: {
        applications: {
          select: { submittedAt: true, updatedAt: true, status: true },
        },
      },
    });

    const result = serviceTypes.map((service) => {
      const totalCount = service.applications.length;

      // Filter to released/completed applications to determine speed
      const releasedApps = service.applications.filter((a) => a.status === 'RELEASED');

      let averageDays = 0;
      if (releasedApps.length > 0) {
        const totalDuration = releasedApps.reduce((acc, curr) => {
          const diffMs = new Date(curr.updatedAt).getTime() - new Date(curr.submittedAt).getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return acc + diffDays;
        }, 0);
        averageDays = Number((totalDuration / releasedApps.length).toFixed(1));
      } else {
        // Fallback default target processing time
        averageDays = service.processingDays;
      }

      return {
        serviceName: service.name,
        count: totalCount,
        averageDays,
      };
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[AnalyticsByService Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang mga detalye ng bawat serbisyo.',
    });
  }
});

/**
 * GET /admin/analytics/by-barangay
 * Groups and counts submissions based on the citizen's residential barangay.
 */
router.get('/by-barangay', async (req, res) => {
  try {
    const lguId = req.user!.lguId;
    if (!lguId) {
      return res.status(403).json({ success: false, error: 'No LGU scoped to user.' });
    }

    // Grab applications alongside citizen barangay
    const applications = await prisma.application.findMany({
      where: { lguId },
      include: {
        citizen: { select: { barangay: true } },
      },
    });

    const barangayMap: Record<string, number> = {};

    applications.forEach((app) => {
      const brgy = app.citizen?.barangay || 'Hindi Tinukoy';
      barangayMap[brgy] = (barangayMap[brgy] || 0) + 1;
    });

    const result = Object.keys(barangayMap).map((barangay) => ({
      barangay,
      count: barangayMap[barangay],
    }));

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[AnalyticsByBarangay Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi makuha ang barangay distribution ng mga aplikasyon.',
    });
  }
});

export default router;
