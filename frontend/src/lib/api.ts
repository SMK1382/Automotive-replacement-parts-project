// ===================================================================
// کلاینت ارتباط با API بک‌اند
// -------------------------------------------------------------------
// - توکن از localStorage خوانده و در هدر Authorization قرار می‌گیرد
// - پاسخ خطای ۴۰۱ باعث خروج خودکار کاربر می‌شود
// - خطاها همیشه با پیام فارسی و قابل نمایش به کامپوننت برمی‌گردند
// ===================================================================

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// رویداد خروج خودکار (توکن منقضی) — AuthContext به آن گوش می‌دهد
export const AUTH_EXPIRED_EVENT = 'auth:expired';

async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید');
  }

  if (res.status === 401 && typeof window !== 'undefined') {
    // توکن نامعتبر/منقضی است؛ کاربر باید دوباره وارد شود
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (!res.ok) {
    let message = 'درخواست ناموفق بود';
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // بدنه JSON نبود؛ پیام پیش‌فرض حفظ می‌شود
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const apiPut = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
export const apiDelete = <T>(path: string) =>
  api<T>(path, { method: 'DELETE' });
