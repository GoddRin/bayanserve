import jwt from 'jsonwebtoken';
import type { UserRole } from '@bayanserve/types';

const JWT_SECRET = process.env.JWT_SECRET || '3h7Dk8Jm5NqR9tY2w4v6z8B1C3D5E7G9';

export interface UserJWTPayload {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  lguId: string | null;
}

/**
 * Signs a payload to generate a JWT token.
 * Expired in 24 hours.
 */
export function signToken(payload: UserJWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verifies a JWT token and decodes it back to the payload.
 */
export function verifyToken(token: string): UserJWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserJWTPayload;
  } catch (error) {
    return null;
  }
}
