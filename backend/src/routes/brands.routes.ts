// ===================================================================
// مسیرهای برندها و مدل‌های خودرو
// -------------------------------------------------------------------
// GET    /api/brands                 -> لیست برندها (عمومی؛ withModels=1
//                                        مدل‌ها را هم برمی‌گرداند برای منو)
// GET    /api/brands/slug/:slug      -> برند + مدل‌های آن (عمومی)
// POST   /api/brands                 -> ساخت برند (ادمین)
// PUT    /api/brands/:id             -> ویرایش برند (ادمین)
// DELETE /api/brands/:id             -> حذف برند (ادمین)
// GET    /api/car-models             -> همه مدل‌ها (عمومی؛ برای فیلتر)
// POST   /api/car-models             -> ساخت مدل (ادمین)
// PUT    /api/car-models/:id         -> ویرایش مدل (ادمین)
// DELETE /api/car-models/:id         -> حذف مدل (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { brands, carModels, parts } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isIdParam } from '../lib/validators.js';

const router = Router();

function slugify(text: string): string {
  return text
    .trim()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

const brandSchema = z.object({
  name: z.string().min(1, 'نام برند الزامی است'),
  slug: z.string().min(1).optional(),
  logoUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const carModelSchema = z.object({
  brandId: z.number().int(),
  name: z.string().min(1, 'نام مدل الزامی است'),
  slug: z.string().min(1).optional(),
});

// ------------------------------------------------------------------
// برندها
// ------------------------------------------------------------------

// لیست برندها (فعال) + تعداد قطعات
router.get('/', async (req, res) => {
  try {
    const withModels = req.query.withModels === '1';
    const rows = await db
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
        logoUrl: brands.logoUrl,
        description: brands.description,
        sortOrder: brands.sortOrder,
        isActive: brands.isActive,
        partsCount: sql<number>`(
          select count(*)::int from parts p
          where p.brand_id = ${brands.id} and p.is_active = true
        )`,
      })
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(brands.sortOrder, brands.id);

    if (!withModels) return res.json(rows);

    const models = await db.select().from(carModels).orderBy(carModels.name);
    res.json(
      rows.map((b) => ({ ...b, models: models.filter((m) => m.brandId === b.id) })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت برندها' });
  }
});

// یک برند با اسلاگ + مدل‌هایش
router.get('/slug/:slug', async (req, res) => {
  try {
    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, req.params.slug))
      .limit(1);
    if (!brand || !brand.isActive)
      return res.status(404).json({ error: 'برند پیدا نشد' });

    const models = await db
      .select()
      .from(carModels)
      .where(eq(carModels.brandId, brand.id))
      .orderBy(carModels.name);

    res.json({ ...brand, models });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت برند' });
  }
});

// ساخت برند (ادمین)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const parsed = brandSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { slug, ...rest } = parsed.data;
    let finalSlug = slugify(slug || rest.name);
    const [exists] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.slug, finalSlug))
      .limit(1);
    if (exists) finalSlug = `${finalSlug}-${Date.now() % 10000}`;

    const [created] = await db
      .insert(brands)
      .values({ ...rest, slug: finalSlug })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت برند' });
  }
});

// ویرایش برند (ادمین)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'برند پیدا نشد' });
    const parsed = brandSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
    const { slug, ...rest } = parsed.data;
    const values: Record<string, unknown> = { ...rest };
    if (slug) values.slug = slugify(slug);

    const [updated] = await db
      .update(brands)
      .set(values)
      .where(eq(brands.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'برند پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش برند' });
  }
});

// حذف برند (ادمین) — با قطعات مرتبط اجازه حذف نمی‌دهیم
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'برند پیدا نشد' });
    const id = Number(req.params.id);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parts)
      .where(eq(parts.brandId, id));
    if (count > 0) {
      return res.status(400).json({
        error: 'این برند دارای قطعه است؛ اول قطعات را منتقل یا حذف کنید',
      });
    }
    const [deleted] = await db.delete(brands).where(eq(brands.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'برند پیدا نشد' });
    res.json({ message: 'برند حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف برند' });
  }
});

// ------------------------------------------------------------------
// مدل‌های خودرو
// ------------------------------------------------------------------

// همه مدل‌ها با نام برند (برای فیلترها و فرم ادمین)
router.get('/car-models/all', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: carModels.id,
        name: carModels.name,
        slug: carModels.slug,
        brandId: carModels.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
      })
      .from(carModels)
      .innerJoin(brands, eq(carModels.brandId, brands.id))
      .orderBy(brands.sortOrder, carModels.name);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت مدل‌ها' });
  }
});

export const carModelsRouter = Router();

// ساخت مدل (ادمین)
carModelsRouter.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const parsed = carModelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { slug, ...rest } = parsed.data;
    const finalSlug = slugify(slug || rest.name);
    const [created] = await db
      .insert(carModels)
      .values({ ...rest, slug: finalSlug })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت مدل — اسلاگ تکراری؟' });
  }
});

// ویرایش مدل (ادمین)
carModelsRouter.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'مدل پیدا نشد' });
    const parsed = carModelSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
    const { slug, ...rest } = parsed.data;
    const values: Record<string, unknown> = { ...rest };
    if (slug) values.slug = slugify(slug);
    const [updated] = await db
      .update(carModels)
      .set(values)
      .where(eq(carModels.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'مدل پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش مدل' });
  }
});

// حذف مدل (ادمین)
carModelsRouter.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'مدل پیدا نشد' });
    const [deleted] = await db
      .delete(carModels)
      .where(eq(carModels.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'مدل پیدا نشد' });
    res.json({ message: 'مدل حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف مدل' });
  }
});

export default router;
