'use client';

// ===================================================================
// مدیریت کدهای تخفیف
// ===================================================================

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { formatNumber, formatPrice } from '@/lib/format';
import type { Coupon } from '@/lib/types';
import { ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

const emptyForm = {
  code: '',
  type: 'percent' as 'percent' | 'fixed',
  value: '',
  minSubtotal: '',
  maxUses: '',
  expiresAt: '',
  isActive: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setCoupons(await apiGet<Coupon[]>('/api/coupons'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت کدها');
      setCoupons([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!/^[A-Za-z0-9-]{3,}$/.test(form.code.trim())) {
      setFormError('کد باید حداقل ۳ کاراکتر و فقط شامل حرف انگلیسی، عدد و خط تیره باشد');
      return;
    }
    const value = Number(form.value);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError('مقدار تخفیف باید بزرگ‌تر از صفر باشد');
      return;
    }
    if (form.type === 'percent' && value > 100) {
      setFormError('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد');
      return;
    }

    const body: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value,
      isActive: form.isActive,
    };
    if (form.minSubtotal) body.minSubtotal = Number(form.minSubtotal);
    if (form.maxUses) body.maxUses = Number(form.maxUses);
    else body.maxUses = null;
    if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();
    else body.expiresAt = null;

    try {
      if (editingId) await apiPut(`/api/coupons/${editingId}`, body);
      else await apiPost('/api/coupons', body);
      setMsg(editingId ? 'کد به‌روزرسانی شد.' : 'کد تخفیف ساخته شد.');
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ذخیره کد');
    }
  }

  async function remove(id: number, code: string) {
    if (!window.confirm(`کد «${code}» حذف شود؟`)) return;
    try {
      await apiDelete(`/api/coupons/${id}`);
      setMsg('کد حذف شد.');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در حذف کد');
    }
  }

  if (coupons === null) return <Loading />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>مدیریت کدهای تخفیف</h1>

      {msg && <p className="formSuccess">{msg}</p>}

      <form className={styles.formCard} onSubmit={submit} noValidate>
        <h2>{editingId ? `ویرایش کد #${editingId}` : 'کد تخفیف جدید'}</h2>
        {formError && <p className="formError">{formError}</p>}

        <div className={styles.grid3}>
          <div className="field">
            <label className="label">کد *</label>
            <input
              className="input"
              dir="ltr"
              placeholder="SUMMER1404"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
            />
          </div>
          <div className="field">
            <label className="label">نوع *</label>
            <select
              className="select"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })
              }
            >
              <option value="percent">درصدی</option>
              <option value="fixed">مبلغ ثابت (تومان)</option>
            </select>
          </div>
          <div className="field">
            <label className="label">
              مقدار * {form.type === 'percent' ? '(٪)' : '(تومان)'}
            </label>
            <input
              className="input"
              dir="ltr"
              inputMode="numeric"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value.replace(/\D/g, '') })}
              required
            />
          </div>
          <div className="field">
            <label className="label">حداقل مبلغ سبد (تومان)</label>
            <input
              className="input"
              dir="ltr"
              inputMode="numeric"
              value={form.minSubtotal}
              onChange={(e) => setForm({ ...form, minSubtotal: e.target.value.replace(/\D/g, '') })}
            />
          </div>
          <div className="field">
            <label className="label">حداکثر تعداد استفاده (خالی=نامحدود)</label>
            <input
              className="input"
              dir="ltr"
              inputMode="numeric"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value.replace(/\D/g, '') })}
            />
          </div>
          <div className="field">
            <label className="label">تاریخ انقضا</label>
            <input
              className="input"
              type="date"
              dir="ltr"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
          <input
            type="checkbox"
            style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          فعال
        </label>

        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary">
            {editingId ? 'ذخیره تغییرات' : 'افزودن کد'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setForm(emptyForm);
                setEditingId(null);
              }}
            >
              انصراف
            </button>
          )}
        </div>
      </form>

      {error && <ErrorBox message={error} onRetry={load} />}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>کد</th>
              <th>نوع</th>
              <th>مقدار</th>
              <th>حداقل سبد</th>
              <th>استفاده</th>
              <th>انقضا</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>کدی ثبت نشده است.</td>
              </tr>
            )}
            {coupons.map((c) => {
              const expired = c.expiresAt ? new Date(c.expiresAt) < new Date() : false;
              return (
                <tr key={c.id}>
                  <td><strong dir="ltr">{c.code}</strong></td>
                  <td>{c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td>
                  <td>
                    {c.type === 'percent'
                      ? `٪${formatNumber(c.value)}`
                      : formatPrice(c.value)}
                  </td>
                  <td>{c.minSubtotal ? formatPrice(c.minSubtotal) : '—'}</td>
                  <td>
                    {formatNumber(c.usedCount)}
                    {c.maxUses ? ` / ${formatNumber(c.maxUses)}` : ''}
                  </td>
                  <td className={styles.subText} dir="ltr">
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString('fa-IR')
                      : 'بدون انقضا'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        !c.isActive || expired ? 'badge-cancelled' : 'badge-delivered'
                      }`}
                    >
                      {expired ? 'منقضی' : c.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => {
                          setForm({
                            code: c.code,
                            type: c.type,
                            value: String(c.value),
                            minSubtotal: c.minSubtotal ? String(c.minSubtotal) : '',
                            maxUses: c.maxUses ? String(c.maxUses) : '',
                            expiresAt: c.expiresAt
                              ? new Date(c.expiresAt).toISOString().slice(0, 10)
                              : '',
                            isActive: c.isActive,
                          });
                          setEditingId(c.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => remove(c.id, c.code)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
