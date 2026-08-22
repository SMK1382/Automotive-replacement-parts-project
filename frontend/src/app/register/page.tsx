'use client';

// ===================================================================
// صفحه ثبت‌نام
// -------------------------------------------------------------------
// کاربر نام، ایمیل و رمز را وارد می‌کند. بعد از ثبت‌نام موفق،
// خودکار وارد شده و به پنل کاربر هدایت می‌شود.
// ===================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/lib/types';
import styles from './page.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
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
      const data = await apiPost<{ token: string; user: User }>(
        '/api/auth/register',
        { name, email, password },
      );
      login(data.token, data.user);
      router.push('/panel');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت‌نام');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1 className={styles.title}>ساخت حساب جدید</h1>

        {error && <p className="text-danger" style={{ marginBottom: '1rem' }}>{error}</p>}

        <div className="field">
          <label className="label">نام و نام خانوادگی</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

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
          <label className="label">رمز عبور (حداقل ۶ کاراکتر)</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            dir="ltr"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
        </button>

        <p className={styles.hint}>
          از قبل حساب دارید؟ <Link href="/login">وارد شوید</Link>
        </p>
      </form>
    </div>
  );
}
