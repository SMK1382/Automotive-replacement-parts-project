// ===================================================================
// مسیرهای مقالات بلاگ
// -------------------------------------------------------------------
// GET    /api/articles            -> مقالات منتشرشده (صفحه‌بندی)
// GET    /api/articles/slug/:slug -> یک مقاله با اسلاگ
// POST   /api/articles            -> ساخت مقاله (ادمین)
// PUT    /api/articles/:id        -> ویرایش مقاله (ادمین)
// DELETE /api/articles/:id        -> حذف مقاله (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isIdParam, paginationSchema, paginated } from '../lib/validators.js';

const router = Router();

function slugify(text: string): string {
  return text
    .trim()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

const articleSchema = z.object({
  title: z.string().min(3, 'عنوان مقاله الزامی است'),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(10, 'متن مقاله باید حداقل ۱۰ حرف باشد'),
  coverImageUrl: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
});

// فهرست مقالات منتشرشده (عمومی؛ ادمین با all=1 همه را می‌بیند)
router.get('/', async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse({
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 10,
    });

    let isAdmin = false;
    if (req.query.all === '1') {
      const header = req.headers.authorization;
      if (header?.startsWith('Bearer ')) {
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
    }

    const where = isAdmin ? undefined : eq(articles.isPublished, true);

    const rows = await db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(where);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت مقالات' });
  }
});

// یک مقاله با اسلاگ (عمومی — فقط منتشرشده)
router.get('/slug/:slug', async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, req.params.slug))
      .limit(1);
    if (!row || !row.isPublished)
      return res.status(404).json({ error: 'مقاله پیدا نشد' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت مقاله' });
  }
});

// ساخت مقاله (ادمین)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const parsed = articleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { slug, isPublished, ...rest } = parsed.data;
    let finalSlug = slugify(slug || rest.title);
    const [exists] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, finalSlug))
      .limit(1);
    if (exists) finalSlug = `${finalSlug}-${Date.now() % 10000}`;

    const [created] = await db
      .insert(articles)
      .values({
        ...rest,
        slug: finalSlug,
        isPublished: isPublished ?? false,
        publishedAt: isPublished ? new Date() : null,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت مقاله' });
  }
});

// ویرایش مقاله (ادمین)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'مقاله پیدا نشد' });
    const parsed = articleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'ورودی نامعتبر' });

    const values: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.slug) values.slug = slugify(parsed.data.slug);
    // در صورت انتشار برای اولین بار، تاریخ انتشار ثبت می‌شود
    if (parsed.data.isPublished === true) values.publishedAt = new Date();

    const [updated] = await db
      .update(articles)
      .set(values)
      .where(eq(articles.id, Number(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'مقاله پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش مقاله' });
  }
});

// حذف مقاله (ادمین)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'مقاله پیدا نشد' });
    const [deleted] = await db
      .delete(articles)
      .where(eq(articles.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'مقاله پیدا نشد' });
    res.json({ message: 'مقاله حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف مقاله' });
  }
});

export default router;
