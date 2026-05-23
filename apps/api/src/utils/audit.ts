import { prisma } from '@bayanserve/db';

interface AuditLogParams {
  lguId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Appends a detailed log record to the AuditLog database table.
 * Used for tracking administrative mutations, payments, invites, and status updates.
 */
export async function writeAuditLog({
  lguId,
  userId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
}: AuditLogParams): Promise<any> {
  try {
    return await prisma.auditLog.create({
      data: {
        lguId,
        userId,
        action,
        entityType,
        entityId,
        metadata: (metadata as any) || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('[AuditLog Error]: Failed to write transaction log', error);
    return null;
  }
}
