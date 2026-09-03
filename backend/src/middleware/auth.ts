// ===================================================================
// Middleware های احراز هویت
// -------------------------------------------------------------------
// - verifyToken: توکن JWT را از هدر درخواست می‌خواند و تایید می‌کند.
//                اگر معتبر بود، اطلاعات کاربر را در req.user قرار می‌دهد.
// - requireRole: سطح دسترسی موردنیاز مسیر را بررسی می‌کند و از
//                سلسله‌مراتب نقش‌ها پیروی می‌کند:
//                  super_admin > admin > user
//                یعنی requireRole('admin') به «ادمین» و «سوپر ادمین»
//                اجازه ورود می‌دهد و requireRole('super_admin') فقط
//                به سوپر ادمین.
// نکته: در Express 5 تایپ‌های TypeScript سخت‌گیرانه‌تر شده‌اند و
// middleware باید void برگرداند؛ به همین دلیل پاسخ‌ها با return
// جدا ارسال می‌شوند.
// ===================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// همه نقش‌های سیستم
export type Role = 'user' | 'admin' | 'super_admin';

// سطح هر نقش برای مقایسه سلسله‌مراتبی
const ROLE_LEVEL: Record<Role, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};

// پیام خطای عمومی برای مسیرهای مدیریتی
const FORBIDDEN_MESSAGE = 'دسترسی غیرمجاز';

// بررسی و تایید توکن
export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // هدر Authorization به‌صورت "Bearer <token>" ارسال می‌شود
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'توکن ارسال نشده است' });
    return;
  }

  try {
    const token = header.split(' ')[1]; // جدا کردن بخش توکن
    // تایید اعتبار توکن با کلید محرمانه
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      role: Role;
    };
    req.user = payload; // الصاق اطلاعات کاربر برای استفاده در مسیرها
    next();
  } catch {
    res.status(401).json({ error: 'توکن نامعتبر یا منقضی است' });
  }
}

// بررسی حداقل سطح دسترسی — مثال:
//   router.get('/', verifyToken, requireRole('admin'), handler)
// دسترسی سوپر ادمین همیشه بالاتر از ادمین است و شامل آن می‌شود
export function requireRole(minimum: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as Role | undefined;
    if (!userRole || (ROLE_LEVEL[userRole] ?? 0) < ROLE_LEVEL[minimum]) {
      res.status(403).json({ error: FORBIDDEN_MESSAGE });
      return;
    }
    next();
  };
}

// میان‌بر برای مسیرهای مخصوص سوپر ادمین (مثل مدیریت کاربران)
export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userRole = req.user?.role as Role | undefined;
  if (!userRole || userRole !== 'super_admin') {
    res.status(403).json({ error: 'فقط سوپر مدیر به این بخش دسترسی دارد' });
    return;
  }
  next();
}
