// ===================================================================
// توابع قالب‌بندی مشترک (قیمت، عدد، تاریخ، وضعیت سفارش و...)
// یک‌جا تعریف شده‌اند تا در همه صفحات یکسان باشند.
// ===================================================================

import { API_URL } from './api';
import type { OrderStatus, PaymentStatus, PaymentMethod } from './types';

// قیمت با جداکننده هزارگان فارسی + «تومان»
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${Number(value).toLocaleString('fa-IR')} تومان`;
}

// فقط عدد فارسی (بدون واحد)
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number(value).toLocaleString('fa-IR');
}

// درصد تخفیف یک قطعه (۰ اگر تخفیف ندارد)
export function discountPercent(
  price: number,
  discountPrice: number | null,
): number {
  if (!discountPrice || discountPrice >= price) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
}

// تاریخ شمسی خوانا
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

// تاریخ و ساعت شمسی
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

// آدرس کامل تصویر (مسیر نسبی بک‌اند → URL کامل)
export function imageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_URL}${path}`;
}

// برچسب‌های فارسی وضعیت سفارش
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'در انتظار بررسی',
  confirmed: 'تأیید شده',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'پرداخت نشده',
  paid: 'پرداخت شده',
  refunded: 'بازگشت داده شده',
};

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status as PaymentStatus] ?? status;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card_transfer: 'کارت به کارت',
  cod: 'پرداخت در محل',
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

// گزینه‌های مرتب‌سازی فهرست محصولات
export const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'cheapest', label: 'ارزان‌ترین' },
  { value: 'expensive', label: 'گران‌ترین' },
  { value: 'discount', label: 'بیشترین تخفیف' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

// برچسب نقش کاربر
export function roleLabel(role: string): string {
  if (role === 'super_admin') return 'سوپر مدیر';
  if (role === 'admin') return 'مدیر';
  return 'کاربر';
}

// آیا نقش، سطح دسترسی مدیریتی دارد؟ (ادمین یا بالاتر)
export function isManager(role: string | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}
