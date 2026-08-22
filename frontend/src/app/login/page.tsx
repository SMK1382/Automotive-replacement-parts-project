'use client';

// ===================================================================
// صفحه ورود
// -------------------------------------------------------------------
// کاربر ایمیل و رمز را وارد می‌کند. اگر درست بود، توکن و اطلاعات کاربر
// ذخیره شده و به صفحه مناسب (پنل کاربر یا ادمین) هدایت می‌شود.
// ===================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/lib/types';
import styles from './page.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // درخواست ورود به بک‌اند
      const data = await apiPost<{ token: string; user: User }>(
        '/api/auth/login',
        { email, password },
      );
      // ذخیره توکن و کاربر
      login(data.token, data.user);
      // هدایت بر اساس نقش کاربر
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/panel');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1 className={styles.title}>ورود به حساب</h1>

        {error && <p className="text-danger" style={{ marginBottom: '1rem' }}>{error}</p>}

        <div className="field">
          <label className="label">ایمیل</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
          />
        </div>

        <div className="field">
          <label className="label">رمز عبور</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            dir="ltr"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>

        <p className={styles.hint}>
          حساب ندارید؟ <Link href="/register">ثبت‌نام کنید</Link>
        </p>
      </form>
    </div>
  );
}
