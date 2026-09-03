// ===================================================================
// مسیرهای کد تخفیف
// -------------------------------------------------------------------
// POST /api/coupons/validate -> بررسی کد با مبلغ سبد (کاربر لاگین‌شده)
// GET  /api/coupons          -> لیست همه کدها (ادمین)
// POST /api/coupons          -> ساخت کد (ادمین)
// PUT  /api/coupons/:id      -> ویرایش کد (ادمین)
// DELETE /api/coupons/:id    -> حذف کد (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { coupons } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { evaluateCoupon, findCouponByCode } from '../lib/coupon.js';
import { isIdParam } from '../lib/validators.js';

const router = Router();

const couponSchema = z.object({
  code: z
    .string()
    .min(3, 'کد تخفیف باید حداقل ۳ کاراکتر باشد')
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, 'کد تخفیف فقط شامل حرف انگلیسی، عدد و خط تیره باشد'),
  type: z.enum(['percent', 'fixed']),
  value: z.number().int().positive('مقدار تخفیف باید بزرگ‌تر از صفر باشد'),
  minSubtotal: z.number().int().nonnegative().optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),
});

// بررسی کد با مبلغ سبد خرید (پیش از ثبت سفارش)
router.post('/validate', verifyToken, async (req, res) => {
  try {
    const schema = z.object({
      code: z.string().min(1, 'کد تخفیف را وارد کنید'),
      subtotal: z.number().int().nonnegative(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }

    const coupon = await findCouponByCode(parsed.data.code);
    if (!coupon) return res.status(404).json({ error: 'کد تخفیف یافت نشد' });

    const result = evaluateCoupon(coupon, parsed.data.subtotal);
    if (!result.ok) return res.status(400).json({ error: result.error });

    res.json({
      code: result.coupon.code,
      type: result.coupon.type,
      discount: result.discount,
      finalTotal: result.finalTotal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در بررسی کد تخفیف' });
  }
});

// لیست همه کدها (ادمین)
router.get('/', verifyToken, requireRole('admin'), async (_req, res) => {
  try {
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت کدهای تخفیف' });
  }
});

// ساخت کد (ادمین)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const parsed = couponSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }

    // اعتبارسنجی منطقی: درصد حداکثر ۱۰۰
    if (parsed.data.type === 'percent' && parsed.data.value > 100) {
      return res.status(400).json({ error: 'درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد' });
    }

    const code = parsed.data.code.toUpperCase();
    const [exists] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    if (exists) return res.status(409).json({ error: 'این کد قبلاً ثبت شده است' });

    const { code: _c, ...rest } = parsed.data;
    const [created] = await db
      .insert(coupons)
      .values({ ...rest, code })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت کد تخفیف' });
  }
});

// ویرایش کد (ادمین)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'کد پیدا نشد' });
    const parsed = couponSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'ورودی نامعتبر' });

    const { code, ...rest } = parsed.data;
    const values: Record<string, unknown> = { ...rest };
    if (code) values.code = code.toUpperCase();

    const [updated] = await db
      .update(coupons)
      .set(values)
      .where(eq(coupons.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'کد پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش کد تخفیف' });
  }
});

// حذف کد (ادمین)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'کد پیدا نشد' });
    const [deleted] = await db
      .delete(coupons)
      .where(eq(coupons.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'کد پیدا نشد' });
    res.json({ message: 'کد تخفیف حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف کد تخفیف' });
  }
});

export default router;
