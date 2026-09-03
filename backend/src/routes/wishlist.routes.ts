// ===================================================================
// مسیرهای علاقه‌مندی‌ها
// -------------------------------------------------------------------
// GET    /api/wishlist          -> قطعات موردعلاقه کاربر فعلی
// POST   /api/wishlist/:partId  -> افزودن قطعه به علاقه‌مندی‌ها
// DELETE /api/wishlist/:partId  -> حذف از علاقه‌مندی‌ها
// ===================================================================

import { Router } from 'express';
import { db } from '../db/index.js';
import { wishlist, parts, categories, brands } from '../db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { verifyToken } from '../middleware/auth.js';
import { isIdParam } from '../lib/validators.js';

const router = Router();
router.use(verifyToken);

// لیست علاقه‌مندی‌ها با اطلاعات کامل قطعه
router.get('/', async (req, res) => {
  try {
    const rows = await db
      .select({
        id: wishlist.id,
        createdAt: wishlist.createdAt,
        partId: parts.id,
        name: parts.name,
        slug: parts.slug,
        price: parts.price,
        discountPrice: parts.discountPrice,
        stock: parts.stock,
        partNumber: parts.partNumber,
        categoryName: categories.name,
        brandName: brands.name,
        imageUrl: sql<string | null>`(
          select pi.url from product_images pi
          where pi.part_id = ${parts.id}
          order by pi.sort_order asc limit 1
        )`,
      })
      .from(wishlist)
      .innerJoin(parts, eq(wishlist.partId, parts.id))
      .leftJoin(categories, eq(parts.categoryId, categories.id))
      .leftJoin(brands, eq(parts.brandId, brands.id))
      .where(eq(wishlist.userId, req.user!.id))
      .orderBy(desc(wishlist.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت علاقه‌مندی‌ها' });
  }
});

// افزودن به علاقه‌مندی‌ها
router.post('/:partId', async (req, res) => {
  try {
    if (!isIdParam(req.params.partId))
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    const partId = Number(req.params.partId);

    const [part] = await db
      .select({ id: parts.id })
      .from(parts)
      .where(eq(parts.id, partId))
      .limit(1);
    if (!part) return res.status(404).json({ error: 'قطعه پیدا نشد' });

    const [existing] = await db
      .select({ id: wishlist.id })
      .from(wishlist)
      .where(and(eq(wishlist.userId, req.user!.id), eq(wishlist.partId, partId)))
      .limit(1);
    if (existing)
      return res.status(409).json({ error: 'این قطعه در علاقه‌مندی‌ها هست' });

    await db
      .insert(wishlist)
      .values({ userId: req.user!.id, partId });
    res.status(201).json({ message: 'به علاقه‌مندی‌ها اضافه شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در افزودن به علاقه‌مندی‌ها' });
  }
});

// حذف از علاقه‌مندی‌ها
router.delete('/:partId', async (req, res) => {
  try {
    if (!isIdParam(req.params.partId))
      return res.status(404).json({ error: 'قطعه پیدا نشد' });
    const [deleted] = await db
      .delete(wishlist)
      .where(
        and(
          eq(wishlist.userId, req.user!.id),
          eq(wishlist.partId, Number(req.params.partId)),
        ),
      )
      .returning();
    if (!deleted)
      return res.status(404).json({ error: 'این قطعه در علاقه‌مندی‌های شما نیست' });
    res.json({ message: 'از علاقه‌مندی‌ها حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف از علاقه‌مندی‌ها' });
  }
});

export default router;
