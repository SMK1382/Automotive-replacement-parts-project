// ===================================================================
// مسیرهای دسته‌بندی
// -------------------------------------------------------------------
// GET    /api/categories        -> لیست همه دسته‌ها (عمومی؛ ادمین با
//                                 all=1 دسته‌های غیرفعال را هم می‌بیند)
// GET    /api/categories/tree   -> ساختار درختی دسته‌ها (والد + زیردسته)
// POST   /api/categories        -> ساخت دسته (ادمین)
// PUT    /api/categories/:id    -> ویرایش دسته (ادمین)
// DELETE /api/categories/:id    -> حذف دسته (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { categories, parts } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isIdParam } from '../lib/validators.js';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1, 'نام دسته الزامی است'),
  slug: z.string().min(1).optional(),
  parentId: z.number().int().optional().nullable(),
  iconEmoji: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ساخت اسلاگ فارسی‌پذیر
function slugify(text: string): string {
  return text
    .trim()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

// لیست همه دسته‌ها + تعداد قطعات هر کدام
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.all === '1';
    let isAdmin = false;
    const header = req.headers.authorization;
    if (includeInactive && header?.startsWith('Bearer ')) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const payload = jwt.verify(
          header.split(' ')[1]!,
          process.env.JWT_SECRET!,
        ) as { role: string };
        isAdmin = payload.role === 'admin';
      } catch {
        isAdmin = false;
      }
    }

    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
        iconEmoji: categories.iconEmoji,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
        partsCount: sql<number>`(
          select count(*)::int from parts p
          where p.category_id = ${categories.id} and p.is_active = true
        )`,
      })
      .from(categories)
      .where(isAdmin ? undefined : eq(categories.isActive, true))
      .orderBy(categories.sortOrder, categories.id);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت دسته‌ها' });
  }
});

// ساختار درختی دسته‌ها (برای منو و فیلترها)
router.get('/tree', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.sortOrder, categories.id);

    const tree = rows
      .filter((c) => c.parentId === null)
      .map((parent) => ({
        ...parent,
        children: rows.filter((c) => c.parentId === parent.id),
      }));

    res.json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت دسته‌ها' });
  }
});

// ساخت دسته جدید (ادمین)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { slug, ...rest } = parsed.data;
    let finalSlug = slugify(slug || rest.name);

    // یکتا کردن اسلاگ
    const [exists] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, finalSlug))
      .limit(1);
    if (exists) finalSlug = `${finalSlug}-${Date.now() % 10000}`;

    const [created] = await db
      .insert(categories)
      .values({ ...rest, slug: finalSlug })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت دسته' });
  }
});

// ویرایش دسته (ادمین)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'دسته پیدا نشد' });
    const id = Number(req.params.id);
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'ورودی نامعتبر' });
    }
    const { slug, ...rest } = parsed.data;
    const values: Record<string, unknown> = { ...rest };
    if (slug) values.slug = slugify(slug);

    const [updated] = await db
      .update(categories)
      .set(values)
      .where(eq(categories.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'دسته پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش دسته' });
  }
});

// حذف دسته (ادمین) — اگر قطعه‌ای داخل آن باشد اجازه حذف نمی‌دهیم
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'دسته پیدا نشد' });
    const id = Number(req.params.id);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parts)
      .where(eq(parts.categoryId, id));
    if (count > 0) {
      return res.status(400).json({
        error: 'این دسته دارای قطعه است؛ اول قطعات را منتقل یا حذف کنید',
      });
    }

    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'دسته پیدا نشد' });
    res.json({ message: 'دسته حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف دسته' });
  }
});

export default router;
