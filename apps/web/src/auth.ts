import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@bayanserve/db';
import type { UserRole } from '@bayanserve/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image?: string | null;
      role: UserRole;
      lguId: string | null;
      lguName: string | null;
      mustChangePassword: boolean;
    };
  }

  interface User {
    role: UserRole;
    lguId: string | null;
    lguName: string | null;
    mustChangePassword: boolean;
  }
}

const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  providers: [
    // ── Provider 1: Citizen OTP Login ─────────────────────────────────────
    Credentials({
      id: 'citizen-otp',
      name: 'Citizen OTP',
      credentials: {
        identifier: { label: 'Email or Phone', type: 'text' },
        otp: { label: 'OTP Code', type: 'text' },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier as string | undefined;
        const otp = credentials?.otp as string | undefined;

        if (!identifier || !otp) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }, { phone: identifier }],
          },
          include: { lgu: true },
        });

        if (!user) return null;
        if (!user.otpCode || !user.otpExpiresAt) return null;
        if (user.otpCode !== otp) return null;
        if (new Date() > user.otpExpiresAt) return null;

        // Clear OTP after successful verification
        await prisma.user.update({
          where: { id: user.id },
          data: {
            otpCode: null,
            otpExpiresAt: null,
            isVerified: true,
          },
        });

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role as UserRole,
          lguId: user.lguId,
          lguName: user.lgu?.name ?? null,
          mustChangePassword: false, // Citizens never need to change password
        };
      },
    }),

    // ── Provider 2: Staff Email + Password ────────────────────────────────
    Credentials({
      id: 'staff-credentials',
      name: 'Staff Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { lgu: true },
        });

        if (!user) return null;
        if (!user.password) return null;
        if (user.role === 'CITIZEN') return null; // Citizens cannot use password login

        // Block deactivated/suspended staff accounts
        if (!user.isVerified) return null;

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role as UserRole,
          lguId: user.lguId,
          lguName: user.lgu?.name ?? null,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.lguId = user.lguId;
        token.lguName = user.lguName;
        token.mustChangePassword = user.mustChangePassword;
      }
      // Allow session updates (e.g. after password change clears mustChangePassword)
      if (trigger === 'update') {
        // Re-fetch user from DB to get latest mustChangePassword status
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { mustChangePassword: true },
        });
        if (dbUser) {
          token.mustChangePassword = dbUser.mustChangePassword;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.name = (token.name as string | null) ?? null;
      session.user.email = (token.email as string) ?? '';
      session.user.role = token.role as UserRole;
      session.user.lguId = (token.lguId as string | null) ?? null;
      session.user.lguName = (token.lguName as string | null) ?? null;
      session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
