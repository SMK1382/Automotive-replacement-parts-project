// ===================================================================
// محدودکننده نرخ درخواست سبک (بدون پکیج خارجی)
// -------------------------------------------------------------------
// برای مسیرهای حساس مثل ورود و ثبت‌نام استفاده می‌شود تا حملات
// حدس رمز (brute-force) ساده محدود شوند. حالت درحافظه‌ای است و برای
// یک نمونه سرور کافی است.
// ===================================================================

import { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// پاک‌سازی دوره‌ای سطل‌های منقضی تا حافظه بی‌دلیل رشد نکند
const SWEEP_INTERVAL = 10 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
  lastSweep = now;
}

export function rateLimit(options: {
  windowMs: number; // بازه زمانی (میلی‌ثانیه)
  max: number; // حداکثر درخواست در بازه
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    sweep(now);

    // کلید: IP کاربر (پشت پروکسی، اولین IP واقعی)
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const key = `${ip}:${req.path}`;

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      const seconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(seconds));
      return res.status(429).json({
        error: `درخواست‌های زیاد؛ ${seconds} ثانیه دیگر تلاش کنید`,
      });
    }
    next();
  };
}
