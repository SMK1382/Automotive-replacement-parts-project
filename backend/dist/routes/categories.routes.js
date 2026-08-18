// ===================================================================
// مسیرهای دسته‌بندی
// -------------------------------------------------------------------
// GET    /api/categories        -> لیست همه دسته‌ها (عمومی)
// POST   /api/categories        -> ساخت دسته جدید (فقط ادمین)
// PUT    /api/categories/:id    -> ویرایش دسته (فقط ادمین)
// DELETE /api/categories/:id    -> حذف دسته (فقط ادمین)
// ===================================================================
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
const router = Router();
// قوانین اعتبارسنجی دسته
const categorySchema = z.object({
    name: z.string().min(1, 'نام دسته الزامی است'),
});
// لیست همه دسته‌ها
router.get('/', async (_req, res) => {
    try {
        const rows = await db.select().from(categories);
        res.json(rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطا در دریافت دسته‌ها' });
    }
});
// ساخت دسته جدید (فقط ادمین)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const parsed = categorySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'ورودی نامعتبر' });
        }
        const [created] = await db
            .insert(categories)
            .values(parsed.data)
            .returning();
        res.status(201).json(created);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطا در ساخت دسته' });
    }
});
// ویرایش دسته (فقط ادمین)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const parsed = categorySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'ورودی نامعتبر' });
        }
        const [updated] = await db
            .update(categories)
            .set(parsed.data)
            .where(eq(categories.id, id))
            .returning();
        if (!updated)
            return res.status(404).json({ error: 'دسته پیدا نشد' });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطا در ویرایش دسته' });
    }
});
// حذف دسته (فقط ادمین)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [deleted] = await db
            .delete(categories)
            .where(eq(categories.id, id))
            .returning();
        if (!deleted)
            return res.status(404).json({ error: 'دسته پیدا نشد' });
        res.json({ message: 'دسته حذف شد' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطا در حذف دسته' });
    }
});
export default router;
//# sourceMappingURL=categories.routes.js.map