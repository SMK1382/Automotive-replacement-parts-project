'use client';

// ===================================================================
// زمینه احراز هویت
// -------------------------------------------------------------------
// - توکن و کاربر در localStorage نگهداری می‌شوند
// - هنگام بارگذاری، اعتبار توکن با GET /api/auth/me دوباره بررسی
//   می‌شود تا اطلاعات کهنه یا دستکاری‌شده حذف گردد
// - رویداد auth:expired (توکن منقضی) خروج خودکار را انجام می‌دهد
// ===================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiGet, AUTH_EXPIRED_EVENT } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // خروج کامل (پاک‌سازی حافظه محلی)
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // بارگذاری اولیه: اگر توکن وجود دارد، اطلاعات تازه کاربر را
  // از سرور بگیرد؛ اگر توکن نامعتبر بود، پاک شود
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    apiGet<{ user: User }>('/api/auth/me')
      .then((data) => {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      })
      .catch(() => {
        // خطای شبکه ≠ توکن نامعتبر؛ در خطای شبکه کاربر ذخیره‌شده را
        // نگه می‌داریم تا تجربه آفلاین بهتر باشد
        const cached = localStorage.getItem('user');
        if (cached) {
          try {
            setUser(JSON.parse(cached) as User);
          } catch {
            logout();
          }
        }
      })
      .finally(() => setLoading(false));
  }, [logout]);

  // گوش دادن به رویداد انقضای توکن (خطای ۴۰۱ در api.ts)
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const login = useCallback((token: string, newUser: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  // به‌روزرسانی پروفایل بدون نیاز به ورود دوباره
  const updateUser = useCallback((updated: User) => {
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider استفاده شود');
  return ctx;
}
