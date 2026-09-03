// ===================================================================
// اعتبارسنجی‌های مشترک (Zod)
// -------------------------------------------------------------------
// قواعدی که در چند مسیر API تکرار می‌شوند (موبایل، کد پستی، آدرس)
// یک‌جا تعریف شده‌اند تا همه‌جا یکسان اعمال شوند.
// ===================================================================

import { z } from 'zod';
import { IRAN_PROVINCES, PROVINCE_NAMES } from './iran.js';

// شماره موبایل ایرانی: ۰۹ و ۹ رقم دیگر
export const phoneSchema = z
  .string()
  .regex(/^09\d{9}$/, 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد');

// کد پستی: دقیقاً ۱۰ رقم
export const postalCodeSchema = z
  .string()
  .regex(/^\d{10}$/, 'کد پستی باید دقیقاً ۱۰ رقم باشد');

// اسکیمای کامل یک آدرس (برای دفتر آدرس و ثبت سفارش)
export const addressSchema = z.object({
  receiverName: z.string().min(2, 'نام گیرنده باید حداقل ۲ حرف باشد').max(120),
  receiverPhone: phoneSchema,
  province: z
    .string()
    .refine((p) => PROVINCE_NAMES.includes(p), 'استان انتخاب‌شده معتبر نیست'),
  city: z.string().min(1, 'شهر را انتخاب کنید').max(60),
  postalCode: postalCodeSchema,
  line: z
    .string()
    .min(10, 'آدرس محلی باید حداقل ۱۰ حرف باشد')
    .max(500, 'آدرس خیلی طولانی است'),
});

// اعتبارسنجی تک‌سطحی شهر در استان (به‌صورت جداگانه هم قابل استفاده)
export function validateCityInProvince(province: string, city: string): string | null {
  const cities = IRAN_PROVINCES[province];
  if (!cities) return 'استان انتخاب‌شده معتبر نیست';
  if (!cities.includes(city)) return 'شهر انتخاب‌شده جزو شهرهای این استان نیست';
  return null;
}

// بررسی پارامتر مسیر عددی (در Express 5 مقدار پارامتر می‌تواند آرایه هم باشد)
export function isIdParam(value: string | string[]): boolean {
  return typeof value === 'string' && /^\d+$/.test(value);
}

// پارامترهای صفحه‌بندی استاندارد لیست‌ها
// نکته: از catch استفاده شده تا مقدار خارج از محدوده (مثلاً limit=100)
// به‌جای خطای ۵۰۰، به سقف مجاز برش بخورد
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).catch(60).default(12),
});

// ساخت پاسخ استاندارد صفحه‌بندی
export function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
