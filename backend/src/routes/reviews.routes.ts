// ===================================================================
// مسیرهای نظرات و امتیازها
// -------------------------------------------------------------------
// GET   /api/reviews/part/:partId      -> نظرات تأییدشده یک قطعه + خلاصه
// POST  /api/reviews/part/:partId      -> ثبت نظر (کاربر؛ پس از تأیید نمایش)
// GET   /api/reviews?status=           -> همه نظرات (ادمین)
// PATCH /api/reviews/:id               -> تأیید/رد نظر (ادمین)
// DELETE /api/reviews/:id              -> حذف نظر (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { reviews, users, parts } from '../db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isIdParam } from '../lib/validators.js';

const router = Router();

// نظرات تأییدشده یک قطعه + خلاصه امتیازها (عمومی)
router.get('/part/:partId', async (req, res) => {
  try {
    if (!isIdParam(req.params.partId))
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    const partId = Number(req.params.partId);

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        userName: users.firstName,
        userLastName: users.lastName,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.partId, partId), eq(reviews.status, 'approved')))
      .orderBy(desc(reviews.createdAt));

    const [summary] = await db
      .select({
        avgRating: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 1), 0)::float8`.mapWith(Number),
        count: sql<number>`count(*)::int`,
      })
      .from(reviews)
      .where(and(eq(reviews.partId, partId), eq(reviews.status, 'approved')));

    res.json({ items: rows, ...summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت نظرات' });
  }
});

// ثبت نظر جدید (کاربر لاگین‌شده؛ هر کاربر برای هر قطعه یک نظر)
router.post('/part/:partId', verifyToken, async (req, res) => {
  try {
    if (!isIdParam(req.params.partId))
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    const partId = Number(req.params.partId);

    const schema = z.object({
      rating: z
        .number()
        .int()
        .min(1, 'امتیاز باید بین ۱ تا ۵ باشد')
        .max(5, 'امتیاز باید بین ۱ تا ۵ باشد'),
      comment: z
        .string()
        .min(5, 'متن نظر باید حداقل ۵ حرف باشد')
        .max(1000, 'متن نظر خیلی طولانی است'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }

    const [part] = await db
      .select({ id: parts.id })
      .from(parts)
      .where(eq(parts.id, partId))
      .limit(1);
    if (!part) return res.status(404).json({ error: 'قطعه پیدا نشد' });

    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.partId, partId), eq(reviews.userId, req.user!.id)))
      .limit(1);
    if (existing) {
      return res
        .status(409)
        .json({ error: 'شما قبلاً برای این قطعه نظر ثبت کرده‌اید' });
    }

    const [created] = await db
      .insert(reviews)
      .values({
        partId,
        userId: req.user!.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        status: 'pending',
      })
      .returning();

    res.status(201).json({
      message: 'نظر شما ثبت شد و پس از بررسی نمایش داده می‌شود',
      review: created,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ثبت نظر' });
  }
});

// همه نظرات با فیلتر وضعیت (ادمین)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where =
      status && status !== 'all'
        ? sql`${reviews.status} = ${status}`
        : undefined;

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        status: reviews.status,
        createdAt: reviews.createdAt,
        partId: reviews.partId,
        partName: parts.name,
        partSlug: parts.slug,
        userId: reviews.userId,
        userName: users.firstName,
        userLastName: users.lastName,
      })
      .from(reviews)
      .innerJoin(parts, eq(reviews.partId, parts.id))
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(where)
      .orderBy(desc(reviews.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت نظرات' });
  }
});

// تغییر وضعیت نظر (ادمین)
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'نظر پیدا نشد' });
    const schema = z.object({
      status: z.enum(['pending', 'approved', 'rejected']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });

    const [updated] = await db
      .update(reviews)
      .set({ status: parsed.data.status })
      .where(eq(reviews.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'نظر پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در تغییر وضعیت نظر' });
  }
});

// حذف نظر (ادمین)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'نظر پیدا نشد' });
    const [deleted] = await db
      .delete(reviews)
      .where(eq(reviews.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'نظر پیدا نشد' });
    res.json({ message: 'نظر حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف نظر' });
  }
});

export default router;
