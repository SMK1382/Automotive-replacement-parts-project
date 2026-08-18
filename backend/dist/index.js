// ===================================================================
// نقطه شروع سرور Express
// -------------------------------------------------------------------
// این فایل سرور را راه‌اندازی می‌کند، میان‌افزارها (middleware) را نصب
// می‌کند و مسیرهای API را متصل می‌کند.
// ===================================================================
import 'dotenv/config'; // بارگذاری متغیرهای فایل .env
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import partsRoutes from './routes/parts.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import usersRoutes from './routes/users.routes.js';
const app = express();
// CORS: به فرانت‌اند Next.js (پورت 3000) اجازه می‌دهیم به این سرور درخواست بفرستد
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
// تجزیه بدنه درخواست‌های JSON
app.use(express.json());
// یک مسیر ساده برای بررسی اینکه سرور بالا است
app.get('/', (_req, res) => {
    res.json({ message: 'سرور فروشگاه قطعات تویوتا فعال است' });
});
// متصل کردن مسیرها
app.use('/api/auth', authRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
// میان‌افزار مدیریت خطا (آخرین middleware)
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'خطای داخلی سرور' });
});
// اجرای سرور
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
    console.log(`✅ سرور Express روی پورت ${PORT} اجرا شد`);
    console.log(`   آدرس API: http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map