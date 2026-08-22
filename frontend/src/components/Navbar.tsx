'use client';

// ===================================================================
// نوار بالای سایت
// -------------------------------------------------------------------
// لینک‌های اصلی سایت را نشان می‌دهد و دکمه ورود/خروج یا پنل کاربر را
// بسته به اینکه کاربر وارد شده یا نه، نمایش می‌دهد.
// ===================================================================

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        {/* لوگو / نام سایت */}
        <Link href="/" className={styles.logo}>
          🔧 قطعات تویوتا
        </Link>

        {/* لینک‌های اصلی */}
        <nav className={styles.nav}>
          <Link href="/" className={styles.link}>
            خانه
          </Link>
          <Link href="/parts" className={styles.link}>
            قطعات
          </Link>
        </nav>

        {/* بخش سمت چپ: ورود/خروج یا پنل */}
        <div className={styles.auth}>
          {loading ? (
            // در حال بررسی وضعیت ورود
            <span className="muted">...</span>
          ) : user ? (
            <>
              {/* کاربر وارد شده */}
              {user.role === 'admin' ? (
                <Link href="/admin" className="btn btn-outline">
                  پنل ادمین
                </Link>
              ) : (
                <Link href="/panel" className="btn btn-outline">
                  پنل کاربر
                </Link>
              )}
              <span className={styles.userName}>{user.name}</span>
              <button onClick={logout} className="btn btn-secondary">
                خروج
              </button>
            </>
          ) : (
            <>
              {/* کاربر مهمان */}
              <Link href="/login" className="btn btn-outline">
                ورود
              </Link>
              <Link href="/register" className="btn btn-primary">
                ثبت‌نام
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
