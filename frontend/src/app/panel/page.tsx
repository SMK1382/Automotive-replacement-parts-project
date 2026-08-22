'use client';

// ===================================================================
// صفحه پروفایل کاربر
// -------------------------------------------------------------------
// اطلاعات کاربر فعلی را نشان می‌دهد.
// ===================================================================

import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="card">
      <h1 className={styles.title}>پروفایل من</h1>
      <div className={styles.row}>
        <span className="muted">نام:</span>
        <span>{user.name}</span>
      </div>
      <div className={styles.row}>
        <span className="muted">ایمیل:</span>
        <span dir="ltr">{user.email}</span>
      </div>
      <div className={styles.row}>
        <span className="muted">نقش:</span>
        <span>{user.role === 'admin' ? 'مدیر سایت' : 'کاربر'}</span>
      </div>
    </div>
  );
}
