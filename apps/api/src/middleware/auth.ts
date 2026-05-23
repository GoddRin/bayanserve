import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@bayanserve/types';
import { verifyToken, type UserJWTPayload } from '../utils/jwt';

// Extend Express Request namespace to include the verified user
declare global {
  namespace Express {
    interface Request {
      user?: UserJWTPayload;
    }
  }
}

/**
 * Middleware that validates the Bearer JWT token in the Authorization header.
 * Attaches the decoded user payload to the request object.
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Hindi nakikilalang request (Unauthenticated). Mangyaring mag-log in.',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: 'Malformed authorization header. Format must be "Bearer <token>".',
    });
    return;
  }

  const token = parts[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Luma o maling session token. Mangyaring mag-log in muli.',
    });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Role-Based Access Control (RBAC) middleware generator.
 * Assures the logged-in user possesses one of the allowed role types.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Hindi nakikilalang request (Unauthenticated).',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Walang sapat na pahintulot para sa tungkuling ito (${req.user.role}).`,
      });
      return;
    }

    next();
  };
}
