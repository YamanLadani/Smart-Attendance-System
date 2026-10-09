import { getDB } from '../config/db';
import { auditLogs } from '../db/schema';
import { logger } from '../utils/logger';

interface AuditLogParams {
  userId?: string;
  action: typeof auditLogs.$inferInsert['action'];
  targetType?: string;
  targetId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Create an audit log entry.
 * Non-throwing — audit failures should not break the main operation.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const db = getDB();
    await db.insert(auditLogs).values({
      userId: params.userId || null,
      action: params.action,
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      description: params.description,
      metadata: params.metadata || null,
      ipAddress: params.ipAddress || null,
    });
  } catch (error) {
    // Audit log failure should not break the main operation
    logger.error('Audit log failed:', error);
  }
}
