'use client';

// ===================================================================
// پروفایل کاربر: مشاهده و ویرایش اطلاعات + تغییر رمز عبور
// ===================================================================

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiPut } from '@/lib/api';
import { formatDate, roleLabel } from '@/lib/format';
import type { User } from '@/lib/types';
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();

  const [edit, setEdit] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  if (!user) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');

    const errors: Record<string, string> = {};
    if (edit.firstName.trim().length < 2) errors.firstName = 'نام را وارد کنید';
    if (edit.lastName.trim().length < 2) errors.lastName = 'نام خانوادگی را وارد کنید';
    if (!/^\S+@\S+\.\S+$/.test(edit.email.trim())) errors.email = 'ایمیل معتبر وارد کنید';
    if (!/^09\d{9}$/.test(edit.phone.trim()))
      errors.phone = 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const updated = await apiPut<User>('/api/auth/profile', {
        firstName: edit.firstName.trim(),
        lastName: edit.lastName.trim(),
        email: edit.email.trim(),
        phone: edit.phone.trim(),
      });
      updateUser(updated);
      setMsg('اطلاعات حساب با موفقیت به‌روزرسانی شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره اطلاعات');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwMsg('');
    if (pw.newPassword.length < 6) {
      setPwError('رمز جدید باید حداقل ۶ کاراکتر باشد');
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      setPwError('تکرار رمز جدید مطابقت ندارد');
      return;
    }
    setPwSaving(true);
    try {
      await apiPut('/api/auth/password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPwMsg('رمز عبور با موفقیت تغییر کرد.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'خطا در تغییر رمز');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>پروفایل کاربری</h1>

      <div className={styles.card}>
        <div className={styles.headRow}>
          <div>
            <strong className={styles.name}>
              {user.firstName} {user.lastName}
            </strong>
            <span className={styles.roleBadge}>
              {roleLabel(user.role)}
            </span>
          </div>
          <span className="muted">عضویت: {formatDate(user.createdAt)}</span>
        </div>
      </div>

      {/* ---------------- ویرایش اطلاعات ---------------- */}
      <form className={styles.card} onSubmit={saveProfile} noValidate>
        <h2>اطلاعات حساب</h2>
        {msg && <p className="formSuccess">{msg}</p>}
        {error && <p className="formError">{error}</p>}

        <div className={styles.grid}>
          <div className="field">
            <label className="label" htmlFor="p-first">نام</label>
            <input
              id="p-first"
              className="input"
              value={edit.firstName}
              onChange={(e) => setEdit({ ...edit, firstName: e.target.value })}
            />
            {fieldErrors.firstName && <span className="fieldError">{fieldErrors.firstName}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="p-last">نام خانوادگی</label>
            <input
              id="p-last"
              className="input"
              value={edit.lastName}
              onChange={(e) => setEdit({ ...edit, lastName: e.target.value })}
            />
            {fieldErrors.lastName && <span className="fieldError">{fieldErrors.lastName}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="p-email">ایمیل</label>
            <input
              id="p-email"
              type="email"
              className="input"
              dir="ltr"
              value={edit.email}
              onChange={(e) => setEdit({ ...edit, email: e.target.value })}
            />
            {fieldErrors.email && <span className="fieldError">{fieldErrors.email}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="p-phone">شماره موبایل</label>
            <input
              id="p-phone"
              className="input"
              dir="ltr"
              inputMode="numeric"
              value={edit.phone}
              onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
            />
            {fieldErrors.phone && <span className="fieldError">{fieldErrors.phone}</span>}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      </form>

      {/* ---------------- تغییر رمز ---------------- */}
      <form className={styles.card} onSubmit={changePassword} noValidate>
        <h2>تغییر رمز عبور</h2>
        {pwMsg && <p className="formSuccess">{pwMsg}</p>}
        {pwError && <p className="formError">{pwError}</p>}

        <div className={styles.grid}>
          <div className="field">
            <label className="label" htmlFor="cur-pw">رمز فعلی</label>
            <input
              id="cur-pw"
              type="password"
              className="input"
              dir="ltr"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="new-pw">رمز جدید</label>
            <input
              id="new-pw"
              type="password"
              className="input"
              dir="ltr"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="confirm-pw">تکرار رمز جدید</label>
            <input
              id="confirm-pw"
              type="password"
              className="input"
              dir="ltr"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-secondary" disabled={pwSaving}>
          {pwSaving ? 'در حال تغییر...' : 'تغییر رمز عبور'}
        </button>
      </form>

      <button
        type="button"
        className={`${styles.logoutBtn} btn btn-outline`}
        onClick={logout}
      >
        خروج از حساب کاربری
      </button>
    </div>
  );
}
