// ===================================================================
// توابع کمکی احراز هویت
// -------------------------------------------------------------------
// - هش کردن رمز عبور (تا رمز به‌صورت متن ساده ذخیره نشود)
// - بررسی رمز عبور هنگام ورود
// - ساخت توکن JWT
// ===================================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// هش کردن رمز عبور با استفاده از bcrypt
export const hashPassword = (plainPassword) => {
    return bcrypt.hash(plainPassword, 10); // 10 = تعداد دورهای هش (هرچه بیشتر، امن‌تر و کندتر)
};
// بررسی اینکه آیا رمز واردشده با هش ذخیره‌شده هم‌خوانی دارد یا نه
export const comparePassword = (plainPassword, hashedPassword) => {
    return bcrypt.compare(plainPassword, hashedPassword);
};
// ساخت توکن JWT (اعتبار ۷ روز)
export function signToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}
//# sourceMappingURL=auth.js.map