// ===================================================================
// مسیرهای کاربران (ادمین) — مدیریت کامل
// -------------------------------------------------------------------
// GET    /api/users                   -> لیست کاربران با جستجو و صفحه‌بندی
// GET    /api/users/:id               -> جزئیات کاربر + آمار + سفارش‌های اخیر
// POST   /api/users                   -> ساخت کاربر جدید توسط ادمین
// PATCH  /api/users/:id               -> ویرایش اطلاعات و نقش کاربر
// PATCH  /api/users/:id/password      -> بازنشانی رمز عبور توسط ادمین
// DELETE /api/users/:id               -> حذف کاربر (اگر سفارش نداشته باشد)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, orders, addresses } from '../db/schema.js';
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { verifyToken, requireSuperAdmin } from '../middleware/auth.js';
import {
  isIdParam,
  paginationSchema,
  paginated,
  phoneSchema,
} from '../lib/validators.js';

const router = Router();
router.use(verifyToken, requireSuperAdmin);

// فیلدهای عمومی کاربر (بدون رمز عبور)
const publicFields = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phone: users.phone,
  role: users.role,
  createdAt: users.createdAt,
};

// بررسی یکتا بودن ایمیل/موبایل (به‌جز خود کاربر)
async function findConflict(
  email: string | undefined,
  phone: string | undefined,
  exceptId?: number,
): Promise<string | null> {
  const conditions = [];
  if (email) conditions.push(eq(users.email, email));
  if (phone) conditions.push(eq(users.phone, phone));
  if (conditions.length === 0) return null;
  const where = exceptId
    ? and(or(...conditions), ne(users.id, exceptId))
    : or(...conditions);
  const [row] = await db
    .select({ email: users.email, phone: users.phone })
    .from(users)
    .where(where)
    .limit(1);
  if (!row) return null;
  return row.email === email
    ? 'این ایمیل قبلاً استفاده شده است'
    : 'این شماره موبایل قبلاً استفاده شده است';
}

// -------------------------------------------------------------------
// لیست کاربران — رمز عبور هرگز برنمی‌گردد
// -------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse({
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 20,
    });
    const q = (req.query.q as string | undefined)?.trim();
    const role = req.query.role === 'admin' || req.query.role === 'super_admin' || req.query.role === 'user'
      ? (req.query.role as 'admin' | 'super_admin' | 'user')
      : undefined;

    const searchWhere = q
      ? or(
          ilike(users.firstName, `%${q}%`),
          ilike(users.lastName, `%${q}%`),
          ilike(users.email, `%${q}%`),
          ilike(users.phone, `%${q}%`),
        )
      : undefined;
    const roleWhere = role ? eq(users.role, role) : undefined;
    const where = [searchWhere, roleWhere].filter(Boolean);
    const finalWhere = where.length > 1 ? and(...where) : where[0];

    const rows = await db
      .select({
        ...publicFields,
        ordersCount: sql<number>`(
          select count(*)::int from orders o where o.user_id = ${users.id}
        )`,
        totalSpent: sql<number>`(
          select coalesce(sum(o.total_amount), 0)::bigint from orders o
          where o.user_id = ${users.id} and o.status <> 'cancelled'
        )`.mapWith(Number),
      })
      .from(users)
      .where(finalWhere)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(finalWhere);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت کاربران' });
  }
});

// -------------------------------------------------------------------
// جزئیات یک کاربر + آمار + سفارش‌های اخیر + آدرس‌ها
// -------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'کاربر پیدا نشد' });
    const id = Number(req.params.id);

    const [user] = await db
      .select(publicFields)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) return res.status(404).json({ error: 'کاربر پیدا نشد' });

    // آمار سفارش‌ها
    const [stats] = await db
      .select({
        ordersCount: sql<number>`count(*)::int`,
        totalSpent: sql<number>`coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.totalAmount} else 0 end), 0)::bigint`.mapWith(
          Number,
        ),
      })
      .from(orders)
      .where(eq(orders.userId, id));

    // سفارش‌های اخیر
    const recentOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    // آدرس‌های کاربر
    const userAddresses = await db
      .select({
        id: addresses.id,
        receiverName: addresses.receiverName,
        province: addresses.province,
        city: addresses.city,
        line: addresses.line,
        isDefault: addresses.isDefault,
      })
      .from(addresses)
      .where(eq(addresses.userId, id));

    res.json({ ...user, ...stats, recentOrders, addresses: userAddresses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
  }
});

// -------------------------------------------------------------------
// ساخت کاربر جدید توسط ادمین
// -------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const schema = z.object({
      firstName: z.string().min(2, 'نام باید حداقل ۲ حرف باشد').max(60),
      lastName: z.string().min(2, 'نام خانوادگی باید حداقل ۲ حرف باشد').max(60),
      email: z.string().email('ایمیل معتبر نیست').max(150),
      phone: phoneSchema,
      password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد').max(100),
      role: z.enum(['user', 'admin', 'super_admin']).default('user'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'ورودی نامعتبر' });

    const { password, ...values } = parsed.data;

    const conflict = await findConflict(values.email, values.phone);
    if (conflict) return res.status(409).json({ error: conflict });

    const [created] = await db
      .insert(users)
      .values({ ...values, password: await bcrypt.hash(password, 10) })
      .returning(publicFields);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ساخت کاربر' });
  }
});

// -------------------------------------------------------------------
// ویرایش اطلاعات کاربر (نام، ایمیل، موبایل، نقش)
// -------------------------------------------------------------------
router.patch('/:id', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'کاربر پیدا نشد' });
    const id = Number(req.params.id);

    const schema = z.object({
      firstName: z.string().min(2).max(60).optional(),
      lastName: z.string().min(2).max(60).optional(),
      email: z.string().email('ایمیل معتبر نیست').max(150).optional(),
      phone: phoneSchema.optional(),
      role: z.enum(['user', 'admin', 'super_admin']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'ورودی نامعتبر' });
    const updates = parsed.data;

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'چیزی برای تغییر ارسال نشده' });

    // ادمین نمی‌تواند نقش خود را تغییر دهد
    if (updates.role && id === req.user!.id)
      return res.status(400).json({ error: 'نقش حساب خودتان را نمی‌توانید تغییر دهید' });

    // نمی‌توان نقش آخرین سوپر ادمین را تنزل داد؛ در غیر این صورت
    // دسترسی مدیریتی سایت برای همیشه قفل می‌شود
    if (updates.role && updates.role !== 'super_admin') {
      const [target] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (target?.role === 'super_admin') {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.role, 'super_admin'));
        if (count <= 1) {
          return res
            .status(400)
            .json({ error: 'تنزل نقش آخرین سوپر مدیر مجاز نیست؛ ابتدا سوپر مدیر دیگری بسازید' });
        }
      }
    }

    const conflict = await findConflict(updates.email, updates.phone, id);
    if (conflict) return res.status(409).json({ error: conflict });

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning(publicFields);
    if (!updated) return res.status(404).json({ error: 'کاربر پیدا نشد' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش کاربر' });
  }
});

// -------------------------------------------------------------------
// بازنشانی رمز عبور کاربر توسط ادمین
// -------------------------------------------------------------------
router.patch('/:id/password', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'کاربر پیدا نشد' });
    const id = Number(req.params.id);

    const schema = z.object({
      newPassword: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد').max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'ورودی نامعتبر' });

    const [updated] = await db
      .update(users)
      .set({ password: await bcrypt.hash(parsed.data.newPassword, 10) })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!updated) return res.status(404).json({ error: 'کاربر پیدا نشد' });
    res.json({ message: 'رمز عبور کاربر با موفقیت تغییر کرد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در تغییر رمز عبور کاربر' });
  }
});

// -------------------------------------------------------------------
// حذف کاربر — اگر سفارش ثبت‌شده داشته باشد حذف نمی‌شود
// (حفظ سوابق مالی؛ آدرس‌ها/نظرات/علاقه‌مندی‌ها cascade حذف می‌شوند)
// -------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'کاربر پیدا نشد' });
    const id = Number(req.params.id);

    if (id === req.user!.id)
      return res.status(400).json({ error: 'حساب خودتان را نمی‌توانید حذف کنید' });

    // حذف آخرین سوپر مدیر ممنوع است
    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (target?.role === 'super_admin') {
      const [{ count: superCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, 'super_admin'));
      if (superCount <= 1) {
        return res
          .status(400)
          .json({ error: 'حذف آخرین سوپر مدیر مجاز نیست؛ ابتدا سوپر مدیر دیگری بسازید' });
      }
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.userId, id));

    if (count > 0) {
      return res.status(409).json({
        error: `این کاربر ${count} سفارش ثبت‌شده دارد و حذف‌شدن سوابق مالی ممکن نیست؛ می‌توانید نقش را تغییر دهید`,
      });
    }

    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!deleted) return res.status(404).json({ error: 'کاربر پیدا نشد' });
    res.json({ message: 'کاربر حذف شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در حذف کاربر' });
  }
});

export default router;
