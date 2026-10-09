import { eq, and, count, inArray } from 'drizzle-orm';
import { getDB } from '../config/db';
import { notifications, type NewNotification } from '../db/schema';
import type { Notification } from '../db/schema';
import { logger } from '../utils/logger';

/**
 * Create a notification for a user.
 */
export const createNotification = async (params: {
  userId: string;
  title: string;
  message: string;
  type: NewNotification['type'];
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> => {
  try {
    const db = getDB();

    const [notification] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link,
        metadata: params.metadata,
      })
      .returning();

    logger.debug(`Notification created for user ${params.userId}: ${params.title}`);
    return notification!;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    throw error;
  }
};

/**
 * Create notifications for multiple users (e.g., low attendance alert).
 */
export const createBulkNotifications = async (
  userIds: string[],
  params: {
    title: string;
    message: string;
    type: NewNotification['type'];
    link?: string;
  }
): Promise<void> => {
  try {
    const db = getDB();

    const rows = userIds.map((userId) => ({
      userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link,
    }));

    await db.insert(notifications).values(rows);
    logger.info(`Bulk notifications created for ${userIds.length} users`);
  } catch (error) {
    logger.error('Failed to create bulk notifications:', error);
    throw error;
  }
};

/**
 * Mark notifications as read.
 */
export const markAsRead = async (
  notificationIds: string[],
  userId: string
): Promise<void> => {
  const db = getDB();

  await db
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(and(
      inArray(notifications.id, notificationIds),
      eq(notifications.userId, userId),
    ));
};

/**
 * Get unread notification count for a user.
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const db = getDB();

  const [result] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
    ));

  return result?.total || 0;
};
