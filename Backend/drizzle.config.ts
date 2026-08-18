import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts', // مسیر فایل تعریف جدول‌ها
  out: './drizzle', // پوشه خروجی فایل‌های migration
  dialect: 'postgresql', // نوع دیتابیس
  dbCredentials: {
    url: process.env.DATABASE_URL!, // آدرس اتصال از فایل .env خوانده می‌شود
  },
});
