// ===================================================================
// مسیرهای احراز هویت
// -------------------------------------------------------------------
// POST /api/auth/register  -> ثبت‌نام کاربر جدید
// POST /api/auth/login     -> ورود کاربر
// GET  /api/auth/me        -> دریافت اطلاعات کاربر فعلی (نیازمند توکن)
// ===================================================================
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword, signToken } from '../lib/auth.js';
import { verifyToken } from '../middleware/auth.js';
const router = Router();
// قوانین اعتبارسنجی فرم ثبت‌نام با Zod
const registerSchema = z.object({
    name: z.string().min(2, 'نام باید حداقل ۲ حرف باشد'),
    email: z.string().email('ایمیل معتبر نیست'),
    password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
});
// ثبت‌نام
router.post('/register', async (req, res) => {
    try {
        // بررسی صحت ورودی‌ها
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
            });
        }
        const { name, email, password } = parsed.data;
        // آیا قبلاً کاربری با این ایمیل ثبت شده؟
        const existing = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است' });
        }
        // ساخت کاربر جدید (رمز هش می‌شود)
        const [created] = await db
            .insert(users)
            .values({
            name,
            email,
            password: await hashPassword(password),
        })
            .returning();
        // ساخت توکن و برگرداندن به کاربر
        const token = signToken({ id: created.id, role: created.role });
        res.status(201).json({
            token,
            user: {
                id: created.id,
                name: created.name,
                email: created.email,
                role: created.role,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطای سرور هنگام ثبت‌نام' });
    }
});
// ورود
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // پیدا کردن کاربر با ایمیل
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        // اگر کاربر نبود یا رمز اشتباه بود
        if (!user || !(await comparePassword(password, user.password))) {
            return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
        }
        const token = signToken({ id: user.id, role: user.role });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطای سرور هنگام ورود' });
    }
});
// دریافت اطلاعات کاربر فعلی (نیازمند توکن)
router.get('/me', verifyToken, async (req, res) => {
    res.json({ user: req.user });
});
export default router;
//# sourceMappingURL=auth.routes.js.map