// ===================================================================
// مسیرهای قطعات (محصولات)
// -------------------------------------------------------------------
// GET    /api/parts                -> لیست قطعات (عمومی) با جستجو، فیلتر،
//                                     مرتب‌سازی و صفحه‌بندی
// GET    /api/parts/featured       -> قطعات ویژه (عمومی)
// GET    /api/parts/slug/:slug     -> جزئیات کامل قطعه با اسلاگ (عمومی)
// GET    /api/parts/:id            -> جزئیات کامل قطعه با آی‌دی (عمومی)
// GET    /api/parts/:id/related    -> قطعات مرتبط (عمومی)
// POST   /api/parts                -> ساخت قطعه (ادمین)
// PUT    /api/parts/:id            -> ویرایش قطعه (ادمین)
// DELETE /api/parts/:id            -> حذف قطعه (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  parts,
  categories,
  brands,
  productImages,
  partCompatibility,
  carModels,
  reviews,
  orderItems,
} from '../db/schema.js';
import {
  and,
  eq,
  ilike,
  or,
  gte,
  lte,
  inArray,
  notInArray,
  desc,
  asc,
  sql,
  isNotNull,
} from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isIdParam, paginationSchema, paginated } from '../lib/validators.js';

const router = Router();

// ------------------------------------------------------------------
// بخش مشترک: فیلدهای انتخاب لیست + امتیاز میانگین
// ------------------------------------------------------------------

// میانگین امتیاز تأییدشده هر قطعه (به‌صورت زیرکوئری)
const ratingSub = db
  .select({
    partId: reviews.partId,
    avgRating: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float8`.as('avg_rating'),
    reviewCount: sql<number>`count(*)::int`.as('review_count'),
  })
  .from(reviews)
  .where(eq(reviews.status, 'approved'))
  .groupBy(reviews.partId)
  .as('rating_sub');

// اولین تصویر هر قطعه به‌صورت زیرکوئری اسکالر
const primaryImageSql = sql<string | null>`(
  select pi.url from product_images pi
  where pi.part_id = ${parts.id}
  order by pi.sort_order asc
  limit 1
)`;

const listSelection = {
  id: parts.id,
  name: parts.name,
  slug: parts.slug,
  price: parts.price,
  discountPrice: parts.discountPrice,
  stock: parts.stock,
  partNumber: parts.partNumber,
  unit: parts.unit,
  isFeatured: parts.isFeatured,
  isActive: parts.isActive,
  createdAt: parts.createdAt,
  categoryId: parts.categoryId,
  categoryName: categories.name,
  categorySlug: categories.slug,
  brandId: parts.brandId,
  brandName: brands.name,
  brandSlug: brands.slug,
  imageUrl: primaryImageSql,
  // mapWith(Number) تضمین می‌کند مقدار به‌صورت عدد (نه رشته) برگردد
  avgRating: sql<number>`coalesce(${ratingSub.avgRating}, 0)::float8`.mapWith(
    Number,
  ),
  reviewCount: sql<number>`coalesce(${ratingSub.reviewCount}, 0)::int`.mapWith(
    Number,
  ),
};

// ------------------------------------------------------------------
// GET / — لیست با جستجو، فیلتر، مرتب‌سازی و صفحه‌بندی
// پارامترها:
//   q, categoryId, brandId, carModelId, minPrice, maxPrice,
//   inStock=1, onDiscount=1, sort=newest|cheapest|expensive|discount,
//   page, limit, all=1 (ادمین: شامل قطعات غیرفعال)
// ------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    // دسته و برند هم با شناسه و هم با اسلاگ قابل فیلتر هستند
    let categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    let brandId = req.query.brandId ? Number(req.query.brandId) : null;
    const categorySlug =
      typeof req.query.category === 'string' ? req.query.category : null;
    const brandSlug =
      typeof req.query.brand === 'string' ? req.query.brand : null;

    if (categorySlug) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1);
      categoryId = cat?.id ?? -1; // اسلاگ ناموجود → نتیجه خالی
    }
    if (brandSlug) {
      const [br] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(eq(brands.slug, brandSlug))
        .limit(1);
      brandId = br?.id ?? -1;
    }

    const carModelId = req.query.carModelId ? Number(req.query.carModelId) : null;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
    const inStock = req.query.inStock === '1';
    const onDiscount = req.query.onDiscount === '1';
    const sort = (req.query.sort as string) || 'newest';
    // ادمین می‌تواند قطعات غیرفعال هم ببیند
    const includeInactive = req.query.all === '1';

    const { page, limit } = paginationSchema.parse({
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 12,
    });

    const conditions = [];

    // قطعات غیرفعال فقط برای ادمین (بررسی نقش از توکن اگر موجود باشد)
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
    if (!isAdmin) conditions.push(eq(parts.isActive, true));

    // جستجو در نام و کد فنی
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(ilike(parts.name, pattern), ilike(parts.partNumber, pattern)),
      );
    }

    // فیلتر دسته: خود دسته + زیردسته‌های آن
    if (categoryId) {
      const childIds = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, categoryId));
      const ids = [categoryId, ...childIds.map((c) => c.id)];
      conditions.push(inArray(parts.categoryId, ids));
    }

    if (brandId) conditions.push(eq(parts.brandId, brandId));

    // فیلتر سازگاری با مدل خودرو
    if (carModelId) {
      conditions.push(
        sql`exists (
          select 1 from part_compatibility pc
          where pc.part_id = ${parts.id} and pc.car_model_id = ${carModelId}
        )`,
      );
    }

    if (minPrice !== null && Number.isFinite(minPrice))
      conditions.push(gte(parts.price, minPrice));
    if (maxPrice !== null && Number.isFinite(maxPrice))
      conditions.push(lte(parts.price, maxPrice));
    if (inStock) conditions.push(sql`${parts.stock} > 0`);
    if (onDiscount) conditions.push(isNotNull(parts.discountPrice));

    const where = conditions.length ? and(...conditions) : undefined;

    // مرتب‌سازی (قیمت مؤثر = قیمت با تخفیف اگر وجود داشت)
    const effectivePrice = sql`coalesce(${parts.discountPrice}, ${parts.price})`;
    const orderBy = {
      newest: [desc(parts.createdAt)],
      cheapest: [asc(effectivePrice)],
      expensive: [desc(effectivePrice)],
      discount: [desc(sql`(${parts.price} - coalesce(${parts.discountPrice}, ${parts.price})) * 100 / ${parts.price}`)],
    }[sort] ?? [desc(parts.createdAt)];

    const rows = await db
      .select(listSelection)
      .from(parts)
      .leftJoin(categories, eq(parts.categoryId, categories.id))
      .leftJoin(brands, eq(parts.brandId, brands.id))
      .leftJoin(ratingSub, eq(ratingSub.partId, parts.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parts)
      .leftJoin(categories, eq(parts.categoryId, categories.id))
      .where(where);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت قطعات' });
  }
});

// ------------------------------------------------------------------
// GET /featured — قطعات ویژه برای صفحه اصلی
// ------------------------------------------------------------------
router.get('/featured', async (_req, res) => {
  try {
    const rows = await db
      .select(listSelection)
      .from(parts)
      .leftJoin(categories, eq(parts.categoryId, categories.id))
      .leftJoin(brands, eq(parts.brandId, brands.id))
      .leftJoin(ratingSub, eq(ratingSub.partId, parts.id))
      .where(and(eq(parts.isActive, true), eq(parts.isFeatured, true)))
      .orderBy(desc(parts.createdAt))
      .limit(8);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت قطعات ویژه' });
  }
});

// ------------------------------------------------------------------
// GET /slug/:slug — جزئیات کامل (تصاویر + سازگاری + امتیاز)
// ------------------------------------------------------------------
async function getPartDetail(where: ReturnType<typeof eq>) {
  const [row] = await db
    .select({
      id: parts.id,
      name: parts.name,
      slug: parts.slug,
      description: parts.description,
      price: parts.price,
      discountPrice: parts.discountPrice,
      stock: parts.stock,
      partNumber: parts.partNumber,
      weightGrams: parts.weightGrams,
      unit: parts.unit,
      isActive: parts.isActive,
      isFeatured: parts.isFeatured,
      metaTitle: parts.metaTitle,
      metaDescription: parts.metaDescription,
      createdAt: parts.createdAt,
      categoryId: parts.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      brandId: parts.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
      avgRating: sql<number>`coalesce(${ratingSub.avgRating}, 0)::float8`.mapWith(
        Number,
      ),
      reviewCount: sql<number>`coalesce(${ratingSub.reviewCount}, 0)::int`.mapWith(
        Number,
      ),
    })
    .from(parts)
    .leftJoin(categories, eq(parts.categoryId, categories.id))
    .leftJoin(brands, eq(parts.brandId, brands.id))
    .leftJoin(ratingSub, eq(ratingSub.partId, parts.id))
    .where(where)
    .limit(1);

  if (!row) return null;

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.partId, row.id))
    .orderBy(asc(productImages.sortOrder));

  const compatibility = await db
    .select({
      id: partCompatibility.id,
      yearsNote: partCompatibility.yearsNote,
      engineCode: partCompatibility.engineCode,
      modelName: carModels.name,
      modelSlug: carModels.slug,
      brandName: brands.name,
      brandSlug: brands.slug,
    })
    .from(partCompatibility)
    .innerJoin(carModels, eq(partCompatibility.carModelId, carModels.id))
    .innerJoin(brands, eq(carModels.brandId, brands.id))
    .where(eq(partCompatibility.partId, row.id));

  return { ...row, images, compatibility };
}

router.get('/slug/:slug', async (req, res) => {
  try {
    const detail = await getPartDetail(eq(parts.slug, req.params.slug));
    if (!detail || !detail.isActive) {
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    }
    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت قطعه' });
  }
});

// ------------------------------------------------------------------
// GET /:id — جزئیات با آی‌دی (حتی غیرفعال، برای ویرایش ادمین)
// نکته: Express 5 از regex داخل پارامتر پشتیبانی نمی‌کند؛
// عددی بودن آی‌دی به‌صورت دستی بررسی می‌شود.
// ------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    const detail = await getPartDetail(eq(parts.id, Number(req.params.id)));
    if (!detail) return res.status(404).json({ error: 'قطعه پیدا نشد' });
    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت قطعه' });
  }
});

// ------------------------------------------------------------------
// GET /:id/related — قطعات مرتبط (هم‌دسته، سپس هم‌برند)
// ------------------------------------------------------------------
router.get('/:id/related', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    const id = Number(req.params.id);
    const [self] = await db
      .select({ categoryId: parts.categoryId, brandId: parts.brandId })
      .from(parts)
      .where(eq(parts.id, id))
      .limit(1);
    if (!self) return res.status(404).json({ error: 'قطعه پیدا نشد' });

    const relatedConditions = [eq(parts.isActive, true), sql`${parts.id} <> ${id}`];
    if (self.categoryId)
      relatedConditions.push(eq(parts.categoryId, self.categoryId));

    let rows = await db
      .select(listSelection)
      .from(parts)
      .leftJoin(categories, eq(parts.categoryId, categories.id))
      .leftJoin(brands, eq(parts.brandId, brands.id))
      .leftJoin(ratingSub, eq(ratingSub.partId, parts.id))
      .where(and(...relatedConditions))
      .limit(8);

    // اگر هم‌دسته‌ها کم بودند، هم‌برندها را هم اضافه کن
    if (rows.length < 4 && self.brandId) {
      const seenIds = rows.length ? rows.map((r) => r.id) : [0];
      const extra = await db
        .select(listSelection)
        .from(parts)
        .leftJoin(categories, eq(parts.categoryId, categories.id))
        .leftJoin(brands, eq(parts.brandId, brands.id))
        .leftJoin(ratingSub, eq(ratingSub.partId, parts.id))
        .where(
          and(
            eq(parts.isActive, true),
            eq(parts.brandId, self.brandId),
            notInArray(parts.id, seenIds),
          ),
        )
        .limit(8 - rows.length);
      rows = [...rows, ...extra];
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت قطعات مرتبط' });
  }
});

// ------------------------------------------------------------------
// اعتبارسنجی بدنه قطعه (ادمین) — شامل تصاویر و سازگاری
// ------------------------------------------------------------------
const partSchema = z.object({
  name: z.string().min(2, 'نام قطعه باید حداقل ۲ حرف باشد'),
  slug: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  price: z.number().int().nonnegative('قیمت معتبر نیست'),
  discountPrice: z.number().int().nonnegative().optional().nullable(),
  stock: z.number().int().nonnegative().optional(),
  partNumber: z.string().optional().nullable(),
  weightGrams: z.number().int().positive().optional().nullable(),
  unit: z.string().optional(),
  categoryId: z.number().int().optional().nullable(),
  brandId: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        alt: z.string().optional().nullable(),
      }),
    )
    .optional(),
  compatibility: z
    .array(
      z.object({
        carModelId: z.number().int(),
        yearsNote: z.string().optional().default(''),
        engineCode: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

// ساخت اسلاگ یکتا از روی نام اگر ارسال نشده باشد
function slugify(text: string): string {
  return text
    .trim()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = slugify(base) || `part-${Date.now()}`;
  let suffix = 1;
  // ادامه دادن تا یافتن اسلاگ آزاد
  for (;;) {
    const [existing] = await db
      .select({ id: parts.id })
      .from(parts)
      .where(eq(parts.slug, slug))
      .limit(1);
    if (!existing || existing.id === excludeId) return slug;
    slug = `${slugify(base)}-${++suffix}`;
  }
}

// ذخیره تصاویر و سازگاری (حذف کامل و درج مجدد)
async function replaceSubEntities(
  partId: number,
  images?: { url: string; alt?: string | null }[],
  compatibility?: { carModelId: number; yearsNote?: string; engineCode?: string | null }[],
) {
  if (images) {
    await db.delete(productImages).where(eq(productImages.partId, partId));
    if (images.length)
      await db.insert(productImages).values(
        images.map((img, i) => ({
          partId,
          url: img.url,
          alt: img.alt ?? null,
          sortOrder: i,
        })),
      );
  }
  if (compatibility) {
    await db.delete(partCompatibility).where(eq(partCompatibility.partId, partId));
    if (compatibility.length)
      await db.insert(partCompatibility).values(
        compatibility.map((c) => ({
          partId,
          carModelId: c.carModelId,
          yearsNote: c.yearsNote ?? '',
          engineCode: c.engineCode ?? null,
        })),
      );
  }
}

// POST / — ساخت قطعه (ادمین)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const parsed = partSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { images, compatibility, slug, ...partValues } = parsed.data;
    const finalSlug = await uniqueSlug(slug || partValues.name);

    const [created] = await db
      .insert(parts)
      .values({ ...partValues, slug: finalSlug })
      .returning();

    await replaceSubEntities(created.id, images, compatibility);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت قطعه' });
  }
});

// PUT /:id — ویرایش قطعه (ادمین)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    const id = Number(req.params.id);
    const parsed = partSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { images, compatibility, slug, ...partValues } = parsed.data;

    // اگر نام یا اسلاگ تغییر کرده، اسلاگ یکتای جدید بساز
    const values: Record<string, unknown> = { ...partValues };
    if (slug) values.slug = await uniqueSlug(slug, id);
    else if (partValues.name) values.slug = await uniqueSlug(partValues.name, id);

    const [updated] = await db
      .update(parts)
      .set(values)
      .where(eq(parts.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'قطعه پیدا نشد' });

    await replaceSubEntities(id, images, compatibility);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش قطعه' });
  }
});

// DELETE /:id — حذف قطعه (ادمین)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    const id = Number(req.params.id);

    // اگر قطعه در سفارش‌ها استفاده شده باشد، سوابق مالی باید حفظ شود؛
    // بنابراین به‌جای حذف کامل، قطعه غیرفعال می‌شود (حذف نرم)
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(eq(orderItems.partId, id));

    if (count > 0) {
      const [updated] = await db
        .update(parts)
        .set({ isActive: false })
        .where(eq(parts.id, id))
        .returning({ id: parts.id, name: parts.name });
      if (!updated) return res.status(404).json({ error: 'قطعه پیدا نشد' });
      return res.json({
        message: `این قطعه در ${count} سفارش استفاده شده و سوابق باید حفظ شود؛ به‌جای حذف کامل، غیرفعال شد`,
        softDeleted: true,
      });
    }

    const [deleted] = await db
      .delete(parts)
      .where(eq(parts.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'قطعه پیدا نشد' });
    res.json({ message: 'قطعه برای همیشه حذف شد', softDeleted: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف قطعه' });
  }
});

export default router;
