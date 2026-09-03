// ===================================================================
// تنظیمات کسب‌وکار (قابل تغییر از طریق متغیرهای محیطی)
// ===================================================================

// هزینه ارسال ثابت (تومان)
export const SHIPPING_COST = Number(process.env.SHIPPING_COST ?? 60_000);

// سبد بالای این مبلغ، ارسال رایگان دارد (تومان)
export const FREE_SHIPPING_THRESHOLD = Number(
  process.env.FREE_SHIPPING_THRESHOLD ?? 5_000_000,
);

// شماره کارت فروشگاه برای پرداخت کارت‌به‌کارت
export const SHOP_CARD_NUMBER = process.env.SHOP_CARD_NUMBER ?? '';
export const SHOP_CARD_HOLDER = process.env.SHOP_CARD_HOLDER ?? '';

// محاسبه هزینه ارسال بر اساس مبلغ سبد
export function calcShippingCost(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}
