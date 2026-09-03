// ===================================================================
// مسیرهای تماس با ما
// -------------------------------------------------------------------
// POST   /api/contact       -> ارسال پیام (عمومی)
// GET    /api/contact       -> همه پیام‌ها (ادمین)
// PATCH  /api/contact/:id   -> علامت‌گذاری خوانده‌شده (ادمین)
// DELETE /api/contact/:id   -> حذف پیام (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { contactMessages } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isIdParam, phoneSchema } from '../lib/validators.js';

const router = Router();

const messageSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ حرف باشد'),
  email: z.string().email('ایمیل معتبر نیست'),
  phone: phoneSchema.optional().nullable(),
  subject: z.string().min(2, 'موضوع را وارد کنید').max(200),
  message: z
    .string()
    .min(10, 'متن پیام باید حداقل ۱۰ حرف باشد')
    .max(3000, 'متن پیام خیلی طولانی است'),
});

// ارسال پیام تماس (عمومی)
router.post('/', async (req, res) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const [created] = await db
      .insert(contactMessages)
      .values(parsed.data)
      .returning({ id: contactMessages.id });
    res.status(201).json({
      message: 'پیام شما ثبت شد؛ کارشناسان ما به‌زودی پاسخ می‌دهند',
      id: created.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ثبت پیام' });
  }
});

// همه پیام‌ها (ادمین)
router.get('/', verifyToken, requireRole('admin'), async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت پیام‌ها' });
  }
});

// علامت‌گذاری خوانده‌شده (ادمین)
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'پیام پیدا نشد' });
    const [updated] = await db
      .update(contactMessages)
      .set({ isRead: true })
      .where(eq(contactMessages.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'پیام پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در به‌روزرسانی پیام' });
  }
});

// حذف پیام (ادمین)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'پیام پیدا نشد' });
    const [deleted] = await db
      .delete(contactMessages)
      .where(eq(contactMessages.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'پیام پیدا نشد' });
    res.json({ message: 'پیام حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف پیام' });
  }
});

export default router;
