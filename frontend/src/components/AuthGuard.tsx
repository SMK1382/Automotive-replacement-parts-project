'use client';

// ===================================================================
// محافظ مسیر (Route Guard)
// -------------------------------------------------------------------
// این کامپوننت دور صفحاتی قرار می‌گیرد که نیاز به ورود دارند.
// اگر کاربر وارد نشده باشد، به صفحه ورود می‌رود.
// اگر نقش موردنظر را نداشته باشد، به صفحه دیگری هدایت می‌شود.
// ===================================================================

import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './AuthGuard.module.css';

export default function AuthGuard({
  children,
  role, // اگر 'admin' باشد، فقط ادمین‌ها اجازه دسترسی دارند
}: {
  children: ReactNode;
  role?: 'admin';
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // تا پایان بارگذاری صبر کن
    if (loading) return;
    // کاربر وارد نشده → صفحه ورود
    if (!user) {
      router.replace('/login');
      return;
    }
    // دسترسی ادمین لازم است ولی کاربر معمولی است → پنل کاربر
    if (role === 'admin' && user.role !== 'admin') {
      router.replace('/panel');
    }
  }, [user, loading, role, router]);

  // در حال بارگذاری، یا کاربر مجاز نیست → پیام بارگذاری نشان بده
  if (
    loading ||
    !user ||
    (role === 'admin' && user.role !== 'admin')
  ) {
    return <div className={styles.loading}>در حال بارگذاری...</div>;
  }

  return <>{children}</>;
}
