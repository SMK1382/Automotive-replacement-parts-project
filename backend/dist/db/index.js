// ===================================================================
// اتصال به دیتابیس
// -------------------------------------------------------------------
// این فایل یک نمونه (instance) از Drizzle می‌سازد که در کل برنامه از آن
// استفاده می‌کنیم تا با دیتابیس PostgreSQL صحبت کنیم.
// ===================================================================
import 'dotenv/config'; // مقادیر فایل .env را در process.env می‌ریزد
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js'; // تعریف جداول
console.log(schema);
// postgres-js: درایور اتصال به PostgreSQL
// max: حداکثر تعداد اتصال‌های همزمان
const client = postgres(process.env.DATABASE_URL, { max: 10 });
// نمونه اصلی Drizzle
// وروردن { schema } باعث می‌شود بتوانیم از db.query.* (پرس‌وجوهای رابطه‌ای) استفاده کنیم.
export const db = drizzle(client, { schema });
//# sourceMappingURL=index.js.map