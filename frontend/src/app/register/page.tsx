'use client';

// ===================================================================
// صفحه ثبت‌نام — نام، نام خانوادگی، ایمیل، موبایل و رمز عبور
// ===================================================================

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiPost } from '@/lib/api';
import { isManager } from '@/lib/format';
import type { User } from '@/lib/types';
import styles from '@/app/(auth)/auth.module.css';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const next = searchParams.get('next');

  useEffect(() => {
    if (!loading && user) {
      router.replace(next || (isManager(user.role) ? '/admin' : '/panel'));
    }
  }, [loading, user, router, next]);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (form.firstName.trim().length < 2)
      errors.firstName = 'نام را وارد کنید';
    if (form.lastName.trim().length < 2)
      errors.lastName = 'نام خانوادگی را وارد کنید';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      errors.email = 'ایمیل معتبر وارد کنید';
    if (!/^09\d{9}$/.test(form.phone.trim()))
      errors.phone = 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد';
    if (form.password.length < 6)
      errors.password = 'رمز عبور باید حداقل ۶ کاراکتر باشد';
    if (form.password !== form.confirmPassword)
      errors.confirmPassword = 'تکرار رمز عبور مطابقت ندارد';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = await apiPost<{ token: string; user: User }>('/api/auth/register', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      login(data.token, data.user);
      router.push(next || '/panel');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت‌نام ناموفق بود');
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.box}>
      <h1 className={styles.title}>ساخت حساب کاربری</h1>
      <p className={styles.subtitle}>
        با ساخت حساب، خرید سریع‌تر و پیگیری سفارش‌ها آسان‌تر می‌شود.
      </p>

      {error && <p className="formError">{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="firstName">
            نام <span className="req">*</span>
          </label>
          <input
            id="firstName"
            className="input"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
          />
          {fieldErrors.firstName && <span className="fieldError">{fieldErrors.firstName}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="lastName">
            نام خانوادگی <span className="req">*</span>
          </label>
          <input
            id="lastName"
            className="input"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
          />
          {fieldErrors.lastName && <span className="fieldError">{fieldErrors.lastName}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-email">
            ایمیل <span className="req">*</span>
          </label>
          <input
            id="reg-email"
            type="email"
            className="input"
            dir="ltr"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            autoComplete="email"
          />
          {fieldErrors.email && <span className="fieldError">{fieldErrors.email}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-phone">
            شماره موبایل <span className="req">*</span>
          </label>
          <input
            id="reg-phone"
            className="input"
            dir="ltr"
            inputMode="numeric"
            placeholder="09123456789"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            autoComplete="tel"
          />
          {fieldErrors.phone && <span className="fieldError">{fieldErrors.phone}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-password">
            رمز عبور <span className="req">*</span>
          </label>
          <input
            id="reg-password"
            type="password"
            className="input"
            dir="ltr"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password"
          />
          {fieldErrors.password && <span className="fieldError">{fieldErrors.password}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="confirm">
            تکرار رمز عبور <span className="req">*</span>
          </label>
          <input
            id="confirm"
            type="password"
            className="input"
            dir="ltr"
            value={form.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)}
            autoComplete="new-password"
          />
          {fieldErrors.confirmPassword && (
            <span className="fieldError">{fieldErrors.confirmPassword}</span>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-large" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
        </button>
      </form>

      <p className={styles.switch}>
        قبلاً ثبت‌نام کرده‌اید؟{' '}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>
          وارد شوید
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
