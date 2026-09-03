'use client';

// ===================================================================
// صفحه ورود — با پشتیبانی از پارامتر next برای بازگشت به مقصد اولیه
// ===================================================================

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiPost } from '@/lib/api';
import { isManager } from '@/lib/format';
import type { User } from '@/lib/types';
import styles from '@/app/(auth)/auth.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const next = searchParams.get('next');

  // کاربر واردشده را به صفحه اصلی خودش هدایت کن
  useEffect(() => {
    if (!loading && user) {
      router.replace(next || (isManager(user.role) ? '/admin' : '/panel'));
    }
  }, [loading, user, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiPost<{ token: string; user: User }>('/api/auth/login', {
        email: email.trim(),
        password,
      });
      login(data.token, data.user);
      router.push(next || (isManager(data.user.role) ? '/admin' : '/panel'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود');
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.box}>
      <h1 className={styles.title}>ورود به حساب کاربری</h1>
      <p className={styles.subtitle}>
        برای خرید، پیگیری سفارش و مدیریت حساب وارد شوید.
      </p>

      {error && <p className="formError">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="email">
            ایمیل <span className="req">*</span>
          </label>
          <input
            id="email"
            type="email"
            className="input"
            dir="ltr"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            رمز عبور <span className="req">*</span>
          </label>
          <input
            id="password"
            type="password"
            className="input"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-large" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>

      <p className={styles.switch}>
        حساب کاربری ندارید؟{' '}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}>
          ثبت‌نام کنید
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
