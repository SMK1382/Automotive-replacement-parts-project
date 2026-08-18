// ===================================================================
// Middleware های احراز هویت
// -------------------------------------------------------------------
// - verifyToken: توکن JWT را از هدر درخواست می‌خواند و تایید می‌کند.
//                اگر معتبر بود، اطلاعات کاربر را در req.user قرار می‌دهد.
// - requireRole: بررسی می‌کند که کاربر نقش موردنظر (مثلاً ادمین) را داشته باشد.
// ===================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// بررسی و تایید توکن
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  // هدر Authorization به‌صورت "Bearer <token>" ارسال می‌شود
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'توکن ارسال نشده است' });
  }

  try {
    const token = header.split(' ')[1]; // جدا کردن بخش توکن
    // تایید اعتبار توکن با کلید محرمانه
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      role: 'user' | 'admin';
    };
    req.user = payload; // الصاق اطلاعات کاربر برای استفاده در مسیرها
    next();
  } catch {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی است' });
  }
}

// بررسی نقش کاربر
// مثال استفاده: router.get('/', verifyToken, requireRole('admin'), handler)
export function requireRole(role: 'user' | 'admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
  };
}
