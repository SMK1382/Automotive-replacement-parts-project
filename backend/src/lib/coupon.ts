// ===================================================================
// منطق مشترک کد تخفیف
// -------------------------------------------------------------------
// هم در POST /api/coupons/validate (نمایش تخفیف در تسویه) و هم در
// ثبت سفارش استفاده می‌شود تا قواعد هر دو جا یکسان باشد.
// ===================================================================

import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { coupons, type Coupon } from '../db/schema.js';

export type CouponResult =
  | { ok: true; coupon: Coupon; discount: number; finalTotal: number }
  | { ok: false; error: string };

// بررسی کامل اعتبار کد و محاسبه مبلغ تخفیف
export function evaluateCoupon(
  coupon: Coupon,
  subtotal: number,
): CouponResult {
  if (!coupon.isActive) return { ok: false, error: 'این کد تخفیف غیرفعال است' };

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: 'این کد تخفیف منقضی شده است' };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: 'ظرفیت استفاده از این کد تکمیل شده است' };
  }

  if (subtotal < coupon.minSubtotal) {
    return { ok: false, error: 'مبلغ سبد خرید برای این کد کافی نیست' };
  }

  let discount =
    coupon.type === 'percent'
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;

  // تخفیف هرگز بیشتر از مبلغ سبد نمی‌شود
  discount = Math.min(discount, subtotal);

  return { ok: true, coupon, discount, finalTotal: subtotal - discount };
}

// پیدا کردن کد با نام (حروف بزرگ/کوچک مهم نیست)
export async function findCouponByCode(code: string): Promise<Coupon | null> {
  const [row] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code.trim().toUpperCase()))
    .limit(1);
  return row ?? null;
}
