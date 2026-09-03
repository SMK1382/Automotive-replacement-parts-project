// ===================================================================
// نقطه شروع سرور Express
// -------------------------------------------------------------------
// این فایل سرور را راه‌اندازی می‌کند، میان‌افزارها (middleware) را نصب
// می‌کند و مسیرهای API را متصل می‌کند.
// ===================================================================

import 'dotenv/config'; // بارگذاری متغیرهای فایل .env
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import authRoutes from './routes/auth.routes.js';
import partsRoutes from './routes/parts.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import brandsRoutes, { carModelsRouter } from './routes/brands.routes.js';
import addressesRoutes from './routes/addresses.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import usersRoutes from './routes/users.routes.js';
import couponsRoutes from './routes/coupons.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import bannersRoutes from './routes/banners.routes.js';
import articlesRoutes from './routes/articles.routes.js';
import contactRoutes from './routes/contact.routes.js';
import statsRoutes, { settingsRouter } from './routes/stats.routes.js';
import { rateLimit } from './lib/rateLimit.js';

const app = express();

// CORS: آدرس فرانت‌اند از متغیر محیطی خوانده می‌شود
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// تجزیه بدنه درخواست‌های JSON (حداکثر ۱ مگابایت)
app.use(express.json({ limit: '1mb' }));

// سرو کردن فایل‌های عمومی (تصاویر قطعات، بنرها و مقالات)
// مسیر پوشه public نسبت به این فایل محاسبه می‌شود (ESM)
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
app.use(express.static(publicDir, { maxAge: '1d' }));

// یک مسیر ساده برای بررسی اینکه سرور بالا است
app.get('/', (_req, res) => {
  res.json({ message: 'سرور فروشگاه قطعات یدکی «یدک اکسپرت» فعال است' });
});

// محدود کردن نرخ درخواست مسیرهای حساس (ورود/ثبت‌نام/تماس)
// ۳۰ درخواست در هر ۱۵ دقیقه از هر IP
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/contact', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }));

// متصل کردن مسیرها
app.use('/api/auth', authRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/car-models', carModelsRouter);
app.use('/api/addresses', addressesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', statsRoutes);
app.use('/api/settings', settingsRouter);

// مدیریت مسیرهای ناشناخته (۴۰۴ با فرمت JSON)
app.use((_req, res) => {
  res.status(404).json({ error: 'مسیر یافت نشد' });
});

// میان‌افزار مدیریت خطا (آخرین middleware)
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  },
);

// اجرای سرور
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`✅ سرور Express روی پورت ${PORT} اجرا شد`);
  console.log(`   آدرس API: http://localhost:${PORT}`);
  console.log(`   فرانت‌اند مجاز (CORS): ${FRONTEND_URL}`);
});
