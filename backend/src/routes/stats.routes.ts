// ===================================================================
// مسیر آمار داشبورد ادمین
// -------------------------------------------------------------------
// GET /api/admin/stats -> آمار کلی (تعداد‌ها، درآمد، سفارش‌های اخیر،
//                         قطعات کم‌موجودی)
// ===================================================================

import { Router } from 'express';
import { db } from '../db/index.js';
import { users, parts, orders, reviews, contactMessages } from '../db/schema.js';
import { desc, eq, sql, and, ne } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
  SHOP_CARD_NUMBER,
  SHOP_CARD_HOLDER,
} from '../lib/constants.js';

const router = Router();

// آمار داشبورد ادمین
router.get('/stats', verifyToken, requireRole('admin'), async (_req, res) => {
  try {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    const [partCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parts)
      .where(eq(parts.isActive, true));
    const [pendingReviewCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.status, 'pending'));
    const [unreadMessageCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactMessages)
      .where(eq(contactMessages.isRead, false));

    // تعداد سفارش‌ها به تفکیک وضعیت
    const statusCounts = await db
      .select({
        status: orders.status,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .groupBy(orders.status);

    // درآمد سفارش‌های لغونشده
    const [revenue] = await db
      .select({ total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::bigint` })
      .from(orders)
      .where(ne(orders.status, 'cancelled'));

    // سفارش‌های اخیر
    const recentOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        receiverName: orders.receiverName,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(8);

    // قطعات کم‌موجودی
    const lowStock = await db
      .select({
        id: parts.id,
        name: parts.name,
        stock: parts.stock,
        slug: parts.slug,
      })
      .from(parts)
      .where(and(eq(parts.isActive, true), sql`${parts.stock} <= 5`))
      .orderBy(parts.stock)
      .limit(8);

    res.json({
      users: userCount.count,
      activeParts: partCount.count,
      pendingReviews: pendingReviewCount.count,
      unreadMessages: unreadMessageCount.count,
      ordersByStatus: statusCounts,
      totalRevenue: Number(revenue.total),
      recentOrders,
      lowStock,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

// تنظیمات عمومی فروشگاه به‌صورت یک روتور جدا (عمومی، بدون احراز هویت)
// در index.ts روی /api/settings سوار می‌شود.
export const settingsRouter = Router();
settingsRouter.get('/', (_req, res) => {
  res.json({
    shippingCost: SHIPPING_COST,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shopCardNumber: SHOP_CARD_NUMBER,
    shopCardHolder: SHOP_CARD_HOLDER,
  });
});

export default router;
