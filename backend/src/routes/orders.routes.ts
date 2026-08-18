// ===================================================================
// مسیرهای سفارش
// -------------------------------------------------------------------
// POST  /api/orders         -> ثبت یک سفارش جدید (کاربر لاگین‌شده)
// GET   /api/orders/mine    -> سفارش‌های کاربر فعلی
// GET   /api/orders         -> همه سفارش‌ها (فقط ادمین)
// PATCH /api/orders/:id     -> تغییر وضعیت سفارش (فقط ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { orders, orderItems, parts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// همه مسیرهای این فایل نیاز به توکن دارند
router.use(verifyToken);

// ثبت سفارش جدید
// بدنه درخواست: { items: [{ partId, quantity }], address? }
router.post('/', async (req, res) => {
  try {
    const schema = z.object({
      items: z
        .array(
          z.object({
            partId: z.number().int(),
            quantity: z.number().int().positive(),
          }),
        )
        .min(1, 'حداقل یک قطعه لازم است'),
      address: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { items, address } = parsed.data;
    const userId = req.user!.id;

    // محاسبه مبلغ کل و آماده‌سازی آیتم‌ها
    let totalAmount = 0;
    const itemsToInsert = [];

    for (const item of items) {
      // پیدا کردن قطعه و قیمت آن
      const [part] = await db
        .select()
        .from(parts)
        .where(eq(parts.id, item.partId))
        .limit(1);
      if (!part) {
        return res
          .status(404)
          .json({ error: `قطعه با آی‌دی ${item.partId} پیدا نشد` });
      }
      const lineTotal = part.price * item.quantity;
      totalAmount += lineTotal;
      itemsToInsert.push({
        partId: item.partId,
        quantity: item.quantity,
        price: part.price,
      });
    }

    // ۱) ساخت رکورد سفارش
    const [order] = await db
      .insert(orders)
      .values({
        userId,
        status: 'pending',
        totalAmount,
        address,
      })
      .returning();

    // ۲) افزودن آیتم‌ها به سفارش
    await db.insert(orderItems).values(
      itemsToInsert.map((it) => ({
        orderId: order.id,
        ...it,
      })),
    );

    res.status(201).json({ order, items: itemsToInsert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ثبت سفارش' });
  }
});

// سفارش‌های کاربر فعلی
router.get('/mine', async (req, res) => {
  try {
    const userId = req.user!.id;
    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      with: {
        items: true,
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });
    res.json(userOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت سفارش‌ها' });
  }
});

// همه سفارش‌ها (فقط ادمین)
router.get('/', requireRole('admin'), async (_req, res) => {
  try {
    const allOrders = await db.query.orders.findMany({
      with: {
        items: true,
        user: {
          columns: { id: true, name: true, email: true },
        },
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });
    res.json(allOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت سفارش‌ها' });
  }
});

// تغییر وضعیت سفارش (فقط ادمین)
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      status: z.enum(['pending', 'confirmed', 'delivered', 'cancelled']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    }
    const [updated] = await db
      .update(orders)
      .set({ status: parsed.data.status })
      .where(eq(orders.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'سفارش پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در به‌روزرسانی سفارش' });
  }
});

export default router;
