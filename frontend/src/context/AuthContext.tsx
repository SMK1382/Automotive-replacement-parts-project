'use client';

// ===================================================================
// مدیریت وضعیت ورود کاربر (Auth Context)
// -------------------------------------------------------------------
// این فایل یک "فروشگاه" کوچک است که در کل برنامه می‌توانیم از آن
// بفهمیم کاربر وارد شده یا نه، و توابع ورود/خروج را صدا بزنیم.
// استفاده: const { user, login, logout } = useAuth();
// ===================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@/lib/types';

type AuthContextValue = {
  user: User | null; // کاربر فعلی (اگر لاگین نکرده باشد null)
  loading: boolean; // در حال بارگذاری اولیه از localStorage
  login: (token: string, user: User) => void; // ورود
  logout: () => void; // خروج
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider: باید دور کل برنامه در layout قرار بگیرد
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // هنگام باز شدن صفحه، توکن و کاربر را از localStorage می‌خوانیم
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // اگر داده خراب بود، نادیده می‌گیریم
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // ورود: ذخیره در localStorage و آپدیت state
  function login(_token: string, newUser: User) {
    localStorage.setItem('token', _token);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  }

  // خروج: پاک کردن localStorage و state
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// hook برای استفاده آسان در کامپوننت‌ها
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth باید داخل AuthProvider استفاده شود');
  }
  return ctx;
}
