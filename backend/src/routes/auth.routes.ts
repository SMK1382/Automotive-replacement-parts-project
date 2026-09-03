// ===================================================================
// مسیرهای احراز هویت و حساب کاربری
// -------------------------------------------------------------------
// POST /api/auth/register   -> ثبت‌نام (نام، نام خانوادگی، ایمیل، موبایل، رمز)
// POST /api/auth/login      -> ورود با ایمیل و رمز
// GET  /api/auth/me         -> اطلاعات کامل کاربر فعلی از دیتابیس
// PUT  /api/auth/profile    -> ویرایش پروفایل
// PUT  /api/auth/password   -> تغییر رمز عبور
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import {
  hashPassword,
  comparePassword,
  signToken,
} from '../lib/auth.js';
import { verifyToken } from '../middleware/auth.js';
import { phoneSchema } from '../lib/validators.js';

const router = Router();

// اطلاعات عمومی کاربر (بدون رمز)
const publicUser = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phone: users.phone,
  role: users.role,
  createdAt: users.createdAt,
};

const registerSchema = z.object({
  firstName: z.string().min(2, 'نام باید حداقل ۲ حرف باشد'),
  lastName: z.string().min(2, 'نام خانوادگی باید حداقل ۲ حرف باشد'),
  email: z.string().email('ایمیل معتبر نیست'),
  phone: phoneSchema,
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
});

// ثبت‌نام
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { firstName, lastName, email, phone, password } = parsed.data;

    // بررسی تکراری نبودن ایمیل یا موبایل
    const existing = await db
      .select({ id: users.id, email: users.email, phone: users.phone })
      .from(users)
      .where(or(eq(users.email, email), eq(users.phone, phone)))
      .limit(1);
    if (existing.length > 0) {
      const dup = existing[0]!.email === email ? 'ایمیل' : 'شماره موبایل';
      return res
        .status(409)
        .json({ error: `این ${dup} قبلاً ثبت شده است` });
    }

    const [created] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        phone,
        password: await hashPassword(password),
      })
      .returning(publicUser);

    const token = signToken({ id: created.id, role: created.role });
    res.status(201).json({ token, user: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور هنگام ثبت‌نام' });
  }
});

// ورود
router.post('/login', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email('ایمیل معتبر نیست'),
      password: z.string().min(1, 'رمز عبور را وارد کنید'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (!user || !(await comparePassword(parsed.data.password, user.password))) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    }

    const token = signToken({ id: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطای سرور هنگام ورود' });
  }
});

// اطلاعات کاربر فعلی — همیشه از دیتابیس خوانده می‌شود تا اطلاعات
// توکن کهنه (مثلاً پس از تغییر پروفایل) ملاک نباشد
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [user] = await db
      .select(publicUser)
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);
    if (!user) return res.status(401).json({ error: 'کاربر پیدا نشد' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
  }
});

// ویرایش پروفایل
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const schema = z.object({
      firstName: z.string().min(2, 'نام باید حداقل ۲ حرف باشد'),
      lastName: z.string().min(2, 'نام خانوادگی باید حداقل ۲ حرف باشد'),
      email: z.string().email('ایمیل معتبر نیست'),
      phone: phoneSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { firstName, lastName, email, phone } = parsed.data;
    const userId = req.user!.id;

    // اگر ایمیل یا موبایل تغییر کرده، بررسی تکراری نبودن
    const duplicates = await db
      .select({ id: users.id, email: users.email, phone: users.phone })
      .from(users)
      .where(or(eq(users.email, email), eq(users.phone, phone)))
      .limit(2);
    const conflict = duplicates.find((u) => u.id !== userId);
    if (conflict) {
      const dup = conflict.email === email ? 'ایمیل' : 'شماره موبایل';
      return res.status(409).json({ error: `این ${dup} برای کاربر دیگری ثبت شده است` });
    }

    const [updated] = await db
      .update(users)
      .set({ firstName, lastName, email, phone })
      .where(eq(users.id, userId))
      .returning(publicUser);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ویرایش پروفایل' });
  }
});

// تغییر رمز عبور
router.put('/password', verifyToken, async (req, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, 'رمز فعلی را وارد کنید'),
      newPassword: z.string().min(6, 'رمز جدید باید حداقل ۶ کاراکتر باشد'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);
    if (!user) return res.status(401).json({ error: 'کاربر پیدا نشد' });

    if (!(await comparePassword(parsed.data.currentPassword, user.password))) {
      return res.status(400).json({ error: 'رمز عبور فعلی اشتباه است' });
    }

    await db
      .update(users)
      .set({ password: await hashPassword(parsed.data.newPassword) })
      .where(eq(users.id, user.id));
    res.json({ message: 'رمز عبور با موفقیت تغییر کرد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
  }
});

export default router;
