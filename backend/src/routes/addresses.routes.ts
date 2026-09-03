// ===================================================================
// مسیرهای دفتر آدرس کاربر
// -------------------------------------------------------------------
// GET    /api/addresses                -> آدرس‌های کاربر فعلی
// POST   /api/addresses                -> افزودن آدرس جدید
// PUT    /api/addresses/:id            -> ویرایش آدرس
// DELETE /api/addresses/:id            -> حذف آدرس
// PATCH  /api/addresses/:id/default    -> پیش‌فرض کردن آدرس
// ===================================================================
// قواعد آدرس: استان یکی از ۳۱ استان ایران، شهر باید جزو شهرهای همان
// استان باشد و کد پستی دقیقاً ۱۰ رقم است.
// ===================================================================

import { Router } from 'express';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { addresses } from '../db/schema.js';
import { verifyToken } from '../middleware/auth.js';
import { isIdParam, addressSchema, validateCityInProvince } from '../lib/validators.js';

const router = Router();
router.use(verifyToken);

// اگر آدرس جدید پیش‌فرض شود، بقیه غیرپیش‌فرض می‌شوند
async function clearDefaultExcept(userId: number, keepId: number | null) {
  await db
    .update(addresses)
    .set({ isDefault: false })
    .where(
      keepId === null
        ? eq(addresses.userId, userId)
        : and(eq(addresses.userId, userId), ne(addresses.id, keepId)),
    );
}

// لیست آدرس‌های کاربر
router.get('/', async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, req.user!.id));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت آدرس‌ها' });
  }
});

// افزودن آدرس
router.post('/', async (req, res) => {
  try {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const data = parsed.data;

    const cityError = validateCityInProvince(data.province, data.city);
    if (cityError) return res.status(400).json({ error: cityError });

    const isDefault = req.body.isDefault === true;

    // اولین آدرس کاربر به‌طور خودکار پیش‌فرض می‌شود
    const existing = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, req.user!.id))
      .limit(1);
    const makeDefault = isDefault || existing.length === 0;
    if (makeDefault) await clearDefaultExcept(req.user!.id, null);

    const [created] = await db
      .insert(addresses)
      .values({ ...data, userId: req.user!.id, isDefault: makeDefault })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ثبت آدرس' });
  }
});

// ویرایش آدرس
router.put('/:id', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'آدرس پیدا نشد' });
    const id = Number(req.params.id);

    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const cityError = validateCityInProvince(parsed.data.province, parsed.data.city);
    if (cityError) return res.status(400).json({ error: cityError });

    const [updated] = await db
      .update(addresses)
      .set(parsed.data)
      .where(and(eq(addresses.id, id), eq(addresses.userId, req.user!.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'آدرس پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش آدرس' });
  }
});

// حذف آدرس
router.delete('/:id', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'آدرس پیدا نشد' });
    const [deleted] = await db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, Number(req.params.id)),
          eq(addresses.userId, req.user!.id),
        ),
      )
      .returning();
    if (!deleted) return res.status(404).json({ error: 'آدرس پیدا نشد' });
    res.json({ message: 'آدرس حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف آدرس' });
  }
});

// پیش‌فرض کردن آدرس
router.patch('/:id/default', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'آدرس پیدا نشد' });
    const id = Number(req.params.id);
    const [row] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, req.user!.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'آدرس پیدا نشد' });

    await clearDefaultExcept(req.user!.id, id);
    await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, id));
    res.json({ message: 'آدرس پیش‌فرض شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در تغییر آدرس پیش‌فرض' });
  }
});

export default router;
