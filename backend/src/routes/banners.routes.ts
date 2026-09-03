// ===================================================================
// مسیرهای بنرها
// -------------------------------------------------------------------
// GET    /api/banners?placement=hero|strip -> بنرهای فعال (عمومی)
// POST   /api/banners                      -> ساخت بنر (ادمین)
// PUT    /api/banners/:id                  -> ویرایش بنر (ادمین)
// DELETE /api/banners/:id                  -> حذف بنر (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { banners } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isIdParam } from '../lib/validators.js';

const router = Router();

const bannerSchema = z.object({
  title: z.string().min(1, 'عنوان بنر الزامی است'),
  subtitle: z.string().optional().nullable(),
  imageUrl: z.string().min(1, 'آدرس تصویر الزامی است'),
  linkUrl: z.string().min(1, 'لینک بنر الزامی است'),
  placement: z.enum(['hero', 'strip']),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// بنرهای فعال (عمومی)
router.get('/', async (req, res) => {
  try {
    const placement = req.query.placement as string | undefined;
    const conditions = [eq(banners.isActive, true)];
    if (placement === 'hero' || placement === 'strip')
      conditions.push(eq(banners.placement, placement));

    const rows = await db
      .select()
      .from(banners)
      .where(and(...conditions))
      .orderBy(banners.sortOrder);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت بنرها' });
  }
});

// ساخت بنر (ادمین)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const [created] = await db.insert(banners).values(parsed.data).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت بنر' });
  }
});

// ویرایش بنر (ادمین)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'بنر پیدا نشد' });
    const parsed = bannerSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
    const [updated] = await db
      .update(banners)
      .set(parsed.data)
      .where(eq(banners.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'بنر پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش بنر' });
  }
});

// حذف بنر (ادمین)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'بنر پیدا نشد' });
    const [deleted] = await db
      .delete(banners)
      .where(eq(banners.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'بنر پیدا نشد' });
    res.json({ message: 'بنر حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف بنر' });
  }
});

export default router;
