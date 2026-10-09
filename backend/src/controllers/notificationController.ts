import { type Response } from 'express';
import { eq, and, count, desc, inArray } from 'drizzle-orm';
import { getDB } from '../config/db';
import { notifications } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Get notifications for the current user.
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { page = '1', limit = '20', unreadOnly } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(notifications.userId, req.user.userId)];
    if (unreadOnly === 'true') conditions.push(eq(notifications.isRead, false));

    const whereClause = and(...conditions);

    const [notificationsList, [{ total }], [{ unreadCount }]] = await Promise.all([
      db.select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .offset(offset)
        .limit(limitNum),
      db.select({ total: count() })
        .from(notifications)
        .where(whereClause),
      db.select({ unreadCount: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, req.user.userId),
          eq(notifications.isRead, false),
        )),
    ]);

    sendSuccess(res, 200, 'Notifications retrieved', {
      notifications: notificationsList,
      unreadCount,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    logger.error('Get notifications failed:', error);
    sendError(res, 500, 'Failed to retrieve notifications.');
  }
};

/**
 * Mark notifications as read.
 */
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { notificationIds } = req.body;

    if (notificationIds && Array.isArray(notificationIds)) {
      await db
        .update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(and(
          inArray(notifications.id, notificationIds),
          eq(notifications.userId, req.user.userId),
        ));
    } else {
      // Mark all as read
      await db
        .update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(and(
          eq(notifications.userId, req.user.userId),
          eq(notifications.isRead, false),
        ));
    }

    sendSuccess(res, 200, 'Notifications marked as read');
  } catch (error) {
    logger.error('Mark as read failed:', error);
    sendError(res, 500, 'Failed to mark notifications.');
  }
};

/**
 * Delete a notification.
 */
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, req.params.id as string),
        eq(notifications.userId, req.user.userId),
      ));

    sendSuccess(res, 200, 'Notification deleted');
  } catch (error) {
    logger.error('Delete notification failed:', error);
    sendError(res, 500, 'Failed to delete notification.');
  }
};
