import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@bayanserve/db';
import { signToken } from '../utils/jwt';
import { sendOTPEmail } from '../utils/email';
import { CitizenOTPRequestSchema, CitizenOTPVerifySchema, StaffLoginSchema } from '../utils/schemas';
import { otpRateLimiter } from '../middleware/rate-limit';

const router = Router();

/**
 * POST /auth/citizen/request-otp
 * Generates 6-digit OTP, saves to user, and sends via Gmail SMTP (nodemailer).
 * Capped at 5 requests per 15 minutes per IP.
 */
router.post('/citizen/request-otp', otpRateLimiter, async (req, res) => {
  try {
    const parse = CitizenOTPRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling input.',
      });
    }

    const { identifier } = parse.data;
    const isEmail = identifier.includes('@');

    if (!isEmail) {
      return res.status(400).json({
        success: false,
        error: 'Para sa demo na ito, tanging email address lamang ang sinusuportahan.',
      });
    }

    const email = identifier.trim().toLowerCase();

    // Check if citizen user already exists
    let user = await prisma.user.findFirst({
      where: { email },
    });

    // If citizen user does not exist, auto-signup
    if (!user) {
      // Find default LGU to link if possible, or leave null
      const defaultLgu = await prisma.lgu.findFirst();
      user = await prisma.user.create({
        data: {
          email,
          fullName: 'Matalinong Mamamayan', // Default generic Filipino name
          role: 'CITIZEN',
          isVerified: false,
          lguId: defaultLgu?.id || null,
        },
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Update user record with OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpiresAt: expiresAt,
      },
    });

    // Send the email containing the OTP
    await sendOTPEmail(email, otp, user.fullName);

    return res.json({
      success: true,
      message: 'Ang verification code ay matagumpay na naipadala sa iyong email.',
    });
  } catch (error) {
    console.error('[RequestOTP Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi matapos ang request dahil sa problema sa database o network.',
    });
  }
});

/**
 * POST /auth/citizen/verify-otp
 * Validates OTP + expiry, returns JWT.
 */
router.post('/citizen/verify-otp', async (req, res) => {
  try {
    const parse = CitizenOTPVerifySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling input.',
      });
    }

    const { identifier, otp } = parse.data;
    const email = identifier.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Walang nahanap na user para sa email na ito.',
      });
    }

    // Validate OTP and expiration
    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(401).json({
        success: false,
        error: 'Maling verification code. Mangyaring subukan muli.',
      });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Ang verification code ay expired na. Kumuha ng bagong code.',
      });
    }

    // Reset OTP code upon successful validation
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        isVerified: true,
      },
    });

    // Sign session JWT
    const token = signToken({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      lguId: user.lguId,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          lguId: user.lguId,
        },
      },
      message: 'Matagumpay na pag-verify!',
    });
  } catch (error) {
    console.error('[VerifyOTP Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Problema sa server habang bine-verify ang code.',
    });
  }
});

/**
 * POST /auth/staff/login
 * Staff email/password login (bcrypt comparison), yields JWT.
 */
router.post('/staff/login', async (req, res) => {
  try {
    const parse = StaffLoginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Maling inputs.',
      });
    }

    const { email, password } = parse.data;
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Maling email o password. Pakisuri at subukan muli.',
      });
    }

    if (user.role === 'CITIZEN') {
      return res.status(403).json({
        success: false,
        error: 'Walang access ang mga regular citizen sa staff dashboard.',
      });
    }

    // Compare Bcrypt hashes
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Maling email o password. Pakisuri at subukan muli.',
      });
    }

    const token = signToken({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      lguId: user.lguId,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          lguId: user.lguId,
        },
      },
      message: 'Matagumpay na pag-log in!',
    });
  } catch (error) {
    console.error('[StaffLogin Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Hindi matapos ang pag-login dahil sa internal server error.',
    });
  }
});

export default router;
