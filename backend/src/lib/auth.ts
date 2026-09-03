// ===================================================================
// توابع کمکی احراز هویت
// -------------------------------------------------------------------
// - هش کردن رمز عبور (تا رمز به‌صورت متن ساده ذخیره نشود)
// - بررسی رمز عبور هنگام ورود
// - ساخت توکن JWT
// ===================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// اطلاعات مهمی که داخل توکن JWT قرار می‌گیرد
type TokenPayload = {
  id: number;
  role: 'user' | 'admin' | 'super_admin';
};

// هش کردن رمز عبور با استفاده از bcrypt
export const hashPassword = (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, 10); // 10 = تعداد دورهای هش (هرچه بیشتر، امن‌تر و کندتر)
};

// بررسی اینکه آیا رمز واردشده با هش ذخیره‌شده هم‌خوانی دارد یا نه
export const comparePassword = (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// ساخت توکن JWT (اعتبار ۷ روز)
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}
