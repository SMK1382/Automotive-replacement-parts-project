'use client';

// ===================================================================
// محافظ مسیر (Route Guard)
// -------------------------------------------------------------------
// این کامپوننت دور صفحاتی قرار می‌گیرد که نیاز به ورود دارند.
// اگر کاربر وارد نشده باشد، به صفحه ورود می‌رود.
// اگر نقش موردنظر را نداشته باشد، به صفحه دیگری هدایت می‌شود.
// نقش‌ها سلسله‌مراتب دارند: super_admin > admin > user؛ یعنی مسیر
// با حداقل نقش «ادمین» برای سوپر ادمین هم باز است.
// ===================================================================

import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isManager } from '@/lib/format';
import styles from './AuthGuard.module.css';

export default function AuthGuard({
  children,
  role, // 'admin' = ادمین و سوپر ادمین | 'super_admin' = فقط سوپر ادمین
}: {
  children: ReactNode;
  role?: 'admin' | 'super_admin';
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
    // سطح دسترسی کافی نیست → هدایت به پنل متناسب
    if (role === 'super_admin' && user.role !== 'super_admin') {
      router.replace(isManager(user.role) ? '/admin' : '/panel');
      return;
    }
    if (role === 'admin' && !isManager(user.role)) {
      router.replace('/panel');
    }
  }, [user, loading, role, router]);

  // در حال بارگذاری، یا کاربر مجاز نیست → پیام بارگذاری نشان بده
  if (loading || !user) {
    return <div className={styles.loading}>در حال بارگذاری...</div>;
  }
  if (role === 'super_admin' && user.role !== 'super_admin') {
    return <div className={styles.loading}>در حال بارگذاری...</div>;
  }
  if (role === 'admin' && !isManager(user.role)) {
    return <div className={styles.loading}>در حال بارگذاری...</div>;
  }

  return <>{children}</>;
}
