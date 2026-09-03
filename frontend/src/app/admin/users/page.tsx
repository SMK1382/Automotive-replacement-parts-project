'use client';

// ===================================================================
// مدیریت کاربران (ادمین) — کنترل کامل
// جست‌وجو، فیلتر نقش، ساخت، ویرایش، بازنشانی رمز، حذف و
// مشاهده جزئیات (آمار خرید، سفارش‌های اخیر، آدرس‌ها)
// ===================================================================

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '@/lib/api';
import {
  formatDate,
  formatNumber,
  formatPrice,
  orderStatusLabel,
  roleLabel,
} from '@/lib/format';
import type { User } from '@/lib/types';
import { EmptyState, ErrorBox, Loading } from '@/components/States';
import AuthGuard from '@/components/AuthGuard';
import styles from './users.module.css';

// کاربر لیستی + آمار سفارش
interface UserRow extends User {
  ordersCount?: number;
  totalSpent?: number;
}

// جزئیات کامل کاربر (GET /:id)
interface UserDetail extends UserRow {
  recentOrders?: { id: number; status: string; totalAmount: number; createdAt: string }[];
  addresses?: { id: number; receiverName: string; province: string; city: string; line: string; isDefault: boolean }[];
}

type PanelMode = 'closed' | 'create' | 'edit';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'user' as 'user' | 'admin' | 'super_admin',
};

export default function AdminUsersPage() {
  return (
    <AuthGuard role="super_admin">
      <AdminUsersInner />
    </AuthGuard>
  );
}

function AdminUsersInner() {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'super_admin'>('all');

  const [panel, setPanel] = useState<PanelMode>('closed');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const data = await apiGet<{ items: UserRow[] }>(`/api/users?${params}`);
      setRows(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت کاربران');
      setRows([]);
    }
  }, [q, roleFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300); // جست‌وجوی با تأخیر
    return () => clearTimeout(t);
  }, [load]);

  // بارگذاری جزئیات هنگام باز کردن ردیف
  useEffect(() => {
    if (detailId === null) {
      setDetail(null);
      return;
    }
    apiGet<UserDetail>(`/api/users/${detailId}`)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [detailId]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setFieldErrors({});
    setError('');
    setActionMsg('');
    setPanel('create');
  }

  function openEdit(u: UserRow) {
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      password: '',
      role: u.role,
    });
    setEditingId(u.id);
    setFieldErrors({});
    setError('');
    setActionMsg('');
    setPanel('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (form.firstName.trim().length < 2) errors.firstName = 'نام را وارد کنید';
    if (form.lastName.trim().length < 2) errors.lastName = 'نام خانوادگی را وارد کنید';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'ایمیل معتبر وارد کنید';
    if (!/^09\d{9}$/.test(form.phone.trim()))
      errors.phone = 'موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد';
    if (panel === 'create' && form.password.length < 6)
      errors.password = 'رمز عبور باید حداقل ۶ کاراکتر باشد';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setActionMsg('');
    if (!validate()) return;
    setSaving(true);
    try {
      if (panel === 'create') {
        await apiPost('/api/users', form);
        setActionMsg('کاربر جدید ساخته شد.');
      } else {
        const body: Record<string, unknown> = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        };
        if (editingId !== 1) body.role = form.role; // ادمین اصلی نقش خود را عوض نکند
        await apiPatch(`/api/users/${editingId}`, body);
        setActionMsg('اطلاعات کاربر به‌روزرسانی شد.');
      }
      setPanel('closed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره کاربر');
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(u: UserRow) {
    const pw = window.prompt(`رمز عبور جدید برای «${u.firstName} ${u.lastName}» (حداقل ۶ کاراکتر):`);
    if (!pw) return;
    if (pw.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    try {
      await apiPatch(`/api/users/${u.id}/password`, { newPassword: pw });
      setActionMsg(`رمز عبور «${u.firstName} ${u.lastName}» تغییر کرد.`);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر رمز');
    }
  }

  async function toggleRole(u: UserRow) {
    if (u.role === 'super_admin') {
      setError('تغییر نقش سوپر مدیر از اینجا مجاز نیست؛ از ویرایش کامل استفاده کنید');
      return;
    }
    try {
      await apiPatch(`/api/users/${u.id}`, { role: u.role === 'admin' ? 'user' : 'admin' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر نقش');
    }
  }

  async function remove(u: UserRow) {
    if (
      !window.confirm(
        `کاربر «${u.firstName} ${u.lastName}» حذف شود؟\nآدرس‌ها و علاقه‌مندی‌های او نیز حذف می‌شوند.`,
      )
    )
      return;
    try {
      await apiDelete(`/api/users/${u.id}`);
      setActionMsg('کاربر حذف شد.');
      setError('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف کاربر');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>👥 مدیریت کاربران</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          ➕ افزودن کاربر
        </button>
      </div>

      {actionMsg && <p className="formSuccess">{actionMsg}</p>}
      {error && <p className="formError">{error}</p>}

      {/* ---------------- فرم ساخت/ویرایش ---------------- */}
      {panel !== 'closed' && (
        <form className={styles.formCard} onSubmit={submit} noValidate>
          <h2>{panel === 'create' ? 'کاربر جدید' : `ویرایش کاربر #${editingId}`}</h2>
          <div className={styles.formGrid}>
            <div className="field">
              <label className="label" htmlFor="u-first">نام</label>
              <input
                id="u-first"
                className="input"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              {fieldErrors.firstName && <span className="fieldError">{fieldErrors.firstName}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="u-last">نام خانوادگی</label>
              <input
                id="u-last"
                className="input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              {fieldErrors.lastName && <span className="fieldError">{fieldErrors.lastName}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="u-email">ایمیل</label>
              <input
                id="u-email"
                type="email"
                className="input"
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {fieldErrors.email && <span className="fieldError">{fieldErrors.email}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="u-phone">شماره موبایل</label>
              <input
                id="u-phone"
                className="input"
                dir="ltr"
                inputMode="numeric"
                placeholder="09123456789"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              {fieldErrors.phone && <span className="fieldError">{fieldErrors.phone}</span>}
            </div>
            {panel === 'create' && (
              <div className="field">
                <label className="label" htmlFor="u-pass">رمز عبور</label>
                <input
                  id="u-pass"
                  type="password"
                  className="input"
                  dir="ltr"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                {fieldErrors.password && <span className="fieldError">{fieldErrors.password}</span>}
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="u-role">نقش</label>
              <select
                id="u-role"
                className="select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'user' | 'admin' | 'super_admin' })}
              >
                <option value="user">کاربر</option>
                <option value="admin">مدیر فروشگاه</option>
                <option value="super_admin">سوپر مدیر</option>
              </select>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'در حال ذخیره...' : panel === 'create' ? 'ساخت کاربر' : 'ذخیره تغییرات'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setPanel('closed')}>
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* ---------------- فیلترها ---------------- */}
      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          placeholder="جست‌وجو در نام، ایمیل یا موبایل..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={styles.roleSelect}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | 'user' | 'admin' | 'super_admin')}
          aria-label="فیلتر نقش"
        >
          <option value="all">همه نقش‌ها</option>
          <option value="user">کاربران</option>
          <option value="admin">مدیران فروشگاه</option>
          <option value="super_admin">سوپر مدیران</option>
        </select>
      </div>

      {/* ---------------- فهرست ---------------- */}
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="👥" title="کاربری پیدا نشد" />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>نام و نام خانوادگی</th>
                <th>ایمیل</th>
                <th>موبایل</th>
                <th>نقش</th>
                <th>سفارش‌ها</th>
                <th>مجموع خرید</th>
                <th>عضویت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <Fragment key={u.id}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className={styles.nameBtn}
                        onClick={() => setDetailId(detailId === u.id ? null : u.id)}
                        aria-expanded={detailId === u.id}
                      >
                        {u.firstName} {u.lastName}
                      </button>
                    </td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{u.email}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{u.phone}</td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.roleBadge} ${u.role === 'admin' ? styles.roleAdmin : ''} ${u.role === 'super_admin' ? styles.roleSuperAdmin : ''}`}
                        onClick={() => toggleRole(u)}
                        title="کلیک برای تغییر نقش"
                      >
                        {roleLabel(u.role)}
                      </button>
                    </td>
                    <td>{formatNumber(u.ordersCount ?? 0)}</td>
                    <td>{formatPrice(u.totalSpent ?? 0)}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.miniBtn} onClick={() => openEdit(u)}>
                          ✏️
                        </button>
                        <button type="button" className={styles.miniBtn} onClick={() => resetPassword(u)} title="بازنشانی رمز">
                          🔑
                        </button>
                        <button type="button" className={`${styles.miniBtn} ${styles.dangerBtn}`} onClick={() => remove(u)} title="حذف">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                  {detailId === u.id && (
                    <tr className={styles.detailRow}>
                      <td colSpan={8}>
                        {detail ? (
                          <div className={styles.detailGrid}>
                            <div>
                              <h4>📦 سفارش‌های اخیر</h4>
                              {detail.recentOrders?.length ? (
                                <ul className={styles.detailList}>
                                  {detail.recentOrders.map((o) => (
                                    <li key={o.id}>
                                      #{formatNumber(o.id)} —{' '}
                                      <span className={`badge badge-${o.status}`}>
                                        {orderStatusLabel(o.status)}
                                      </span>{' '}
                                      — {formatPrice(o.totalAmount)}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="muted">سفارشی ثبت نکرده است.</p>
                              )}
                            </div>
                            <div>
                              <h4>📍 آدرس‌ها ({formatNumber(detail.addresses?.length ?? 0)})</h4>
                              {detail.addresses?.length ? (
                                <ul className={styles.detailList}>
                                  {detail.addresses.map((a) => (
                                    <li key={a.id}>
                                      {a.province}، {a.city} — {a.line}
                                      {a.isDefault && <strong> (پیش‌فرض)</strong>}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="muted">آدرسی ثبت نکرده است.</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="muted">در حال بارگذاری جزئیات...</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
