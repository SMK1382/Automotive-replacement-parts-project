'use client';

// ===================================================================
// تابع کمکی برای ارسال درخواست به بک‌اند
// -------------------------------------------------------------------
// این تابع به‌صورت خودکار:
//  - آدرس بک‌اند را اضافه می‌کند
//  - توکن کاربر را (اگر وارد شده باشد) در هدر Authorization می‌گذارد
//  - خطاها را به‌صورت یک پیام فارسی برمی‌گرداند
// ===================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// خواندن توکن از localStorage (فقط در مرورگر وجود دارد)
function getToken(): string | null {
  if (typeof window === 'undefined') return null; // در سرور localStorage وجود ندارد
  return localStorage.getItem('token');
}

// تابع اصلی درخواست
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // اگر توکن داشتیم، آن را در هدر می‌فرستیم
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // اگر پاسخ موفق نبود، پیام خطا را از بک‌اند می‌خوانیم
  if (!res.ok) {
    let message = 'درخواست ناموفق بود';
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // اگر بدنه JSON نبود، پیام پیش‌فرض را نگه می‌داریم
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// توابع کوتاه‌تر برای روش‌های رایج
export const apiGet = <T>(path: string) => api<T>(path);

export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPut = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) =>
  api<T>(path, { method: 'DELETE' });
