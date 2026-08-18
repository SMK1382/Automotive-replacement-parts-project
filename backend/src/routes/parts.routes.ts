// ===================================================================
// مسیرهای قطعات
// -------------------------------------------------------------------
// GET    /api/parts        -> لیست همه قطعات (عمومی) + جستجو
// GET    /api/parts/:id    -> یک قطعه با آی‌دی (عمومی)
// POST   /api/parts        -> ساخت قطعه جدید (فقط ادمین)
// PUT    /api/parts/:id    -> ویرایش قطعه (فقط ادمین)
// DELETE /api/parts/:id    -> حذف قطعه (فقط ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { parts, categories } from '../db/schema.js';
import { eq, ilike, or } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// قوانین اعتبارسنجی قطعه
const partSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().optional(),
  partNumber: z.string().optional(),
  carModel: z.string().optional(),
  imageUrl: z.string().optional(),
  categoryId: z.number().int().optional(),
});

// لیست همه قطعات + امکان جستجو با پارامتر q (در نام یا مدل خودرو)
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();

    let rows;
    if (q) {
      // جستجو در نام قطعه یا مدل خودرو (حساس به حروف بزرگ/کوچک نیست)
      const pattern = `%${q}%`;
      rows = await db
        .select({
          id: parts.id,
          name: parts.name,
          description: parts.description,
          price: parts.price,
          stock: parts.stock,
          partNumber: parts.partNumber,
          carModel: parts.carModel,
          imageUrl: parts.imageUrl,
          categoryId: parts.categoryId,
          createdAt: parts.createdAt,
          categoryName: categories.name,
        })
        .from(parts)
        .leftJoin(categories, eq(parts.categoryId, categories.id))
        .where(or(ilike(parts.name, pattern), ilike(parts.carModel, pattern)));
    } else {
      rows = await db
        .select({
          id: parts.id,
          name: parts.name,
          description: parts.description,
          price: parts.price,
          stock: parts.stock,
          partNumber: parts.partNumber,
          carModel: parts.carModel,
          imageUrl: parts.imageUrl,
          categoryId: parts.categoryId,
          createdAt: parts.createdAt,
          categoryName: categories.name,
        })
        .from(parts)
        .leftJoin(categories, eq(parts.categoryId, categories.id));
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت قطعات' });
  }
});

// یک قطعه با آی‌دی
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db
      .select({
        id: parts.id,
        name: parts.name,
        description: parts.description,
        price: parts.price,
        stock: parts.stock,
        partNumber: parts.partNumber,
        carModel: parts.carModel,
        imageUrl: parts.imageUrl,
        categoryId: parts.categoryId,
        createdAt: parts.createdAt,
        categoryName: categories.name,
      })
      .from(parts)
      .leftJoin(categories, eq(parts.categoryId, categories.id))
      .where(eq(parts.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: 'قطعه پیدا نشد' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت قطعه' });
  }
});

// ساخت قطعه جدید (فقط ادمین)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const parsed = partSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'ورودی نامعتبر' });
    }
    const [created] = await db.insert(parts).values(parsed.data).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت قطعه' });
  }
});

// ویرایش قطعه (فقط ادمین)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = partSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'ورودی نامعتبر' });
    }
    const [updated] = await db
      .update(parts)
      .set(parsed.data)
      .where(eq(parts.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'قطعه پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش قطعه' });
  }
});

// حذف قطعه (فقط ادمین)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db
      .delete(parts)
      .where(eq(parts.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'قطعه پیدا نشد' });
    res.json({ message: 'قطعه حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف قطعه' });
  }
});

export default router;
