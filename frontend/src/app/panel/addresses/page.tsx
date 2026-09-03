'use client';

// ===================================================================
// دفتر آدرس: افزودن، ویرایش، حذف و انتخاب آدرس پیش‌فرض
// شهرها فقط از فهرست شهرهای همان استان قابل انتخاب هستند
// ===================================================================

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { Address } from '@/lib/types';
import { IRAN_PROVINCES } from '@/lib/iran';
import { EmptyState, ErrorBox, Loading } from '@/components/States';
import styles from './addresses.module.css';

const emptyForm = {
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  postalCode: '',
  line: '',
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      setAddresses(await apiGet<Address[]>('/api/addresses'));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'خطا در دریافت آدرس‌ها');
      setAddresses([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const provinces = Object.keys(IRAN_PROVINCES);
  const cities = form.province ? IRAN_PROVINCES[form.province] ?? [] : [];

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setFieldErrors({});
    setError('');
    setFormOpen(true);
  }

  function openEdit(a: Address) {
    setForm({
      receiverName: a.receiverName,
      receiverPhone: a.receiverPhone,
      province: a.province,
      city: a.city,
      postalCode: a.postalCode,
      line: a.line,
    });
    setEditingId(a.id);
    setFieldErrors({});
    setError('');
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (form.receiverName.trim().length < 2)
      errors.receiverName = 'نام و نام خانوادگی گیرنده را کامل وارد کنید';
    if (!/^09\d{9}$/.test(form.receiverPhone.trim()))
      errors.receiverPhone = 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد';
    if (!form.province) errors.province = 'استان را انتخاب کنید';
    if (!form.city) errors.city = 'شهر را انتخاب کنید';
    if (!/^\d{10}$/.test(form.postalCode.trim()))
      errors.postalCode = 'کد پستی باید دقیقاً ۱۰ رقم باشد';
    if (form.line.trim().length < 10)
      errors.line = 'آدرس محلی باید حداقل ۱۰ حرف باشد';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/api/addresses/${editingId}`, form);
      } else {
        await apiPost('/api/addresses', form);
      }
      setFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره آدرس');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm('این آدرس حذف شود؟')) return;
    try {
      await apiDelete(`/api/addresses/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف آدرس');
    }
  }

  async function makeDefault(id: number) {
    try {
      await apiPatch(`/api/addresses/${id}/default`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تنظیم آدرس پیش‌فرض');
    }
  }

  if (addresses === null) return <Loading />;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>آدرس‌های من</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          ➕ افزودن آدرس جدید
        </button>
      </div>

      {loadError && <ErrorBox message={loadError} onRetry={load} />}
      {error && <p className="formError">{error}</p>}

      {/* ---------------- فرم آدرس ---------------- */}
      {formOpen && (
        <form className={styles.formCard} onSubmit={submit} noValidate>
          <h2>{editingId ? 'ویرایش آدرس' : 'آدرس جدید'}</h2>

          <div className={styles.grid}>
            <div className="field">
              <label className="label" htmlFor="a-name">
                نام و نام خانوادگی گیرنده <span className="req">*</span>
              </label>
              <input
                id="a-name"
                className="input"
                value={form.receiverName}
                onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
              />
              {fieldErrors.receiverName && (
                <span className="fieldError">{fieldErrors.receiverName}</span>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="a-phone">
                شماره موبایل <span className="req">*</span>
              </label>
              <input
                id="a-phone"
                className="input"
                dir="ltr"
                inputMode="numeric"
                placeholder="09123456789"
                value={form.receiverPhone}
                onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })}
              />
              {fieldErrors.receiverPhone && (
                <span className="fieldError">{fieldErrors.receiverPhone}</span>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="a-province">
                استان <span className="req">*</span>
              </label>
              <select
                id="a-province"
                className="select"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value, city: '' })}
              >
                <option value="">انتخاب استان...</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {fieldErrors.province && (
                <span className="fieldError">{fieldErrors.province}</span>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="a-city">
                شهر <span className="req">*</span>
              </label>
              <select
                id="a-city"
                className="select"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                disabled={!form.province}
              >
                <option value="">
                  {form.province ? 'انتخاب شهر...' : 'ابتدا استان را انتخاب کنید'}
                </option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {fieldErrors.city && <span className="fieldError">{fieldErrors.city}</span>}
            </div>

            <div className="field">
              <label className="label" htmlFor="a-postal">
                کد پستی (۱۰ رقم) <span className="req">*</span>
              </label>
              <input
                id="a-postal"
                className="input"
                dir="ltr"
                inputMode="numeric"
                placeholder="1234567890"
                value={form.postalCode}
                onChange={(e) =>
                  setForm({ ...form, postalCode: e.target.value.replace(/\D/g, '') })
                }
              />
              {fieldErrors.postalCode && (
                <span className="fieldError">{fieldErrors.postalCode}</span>
              )}
            </div>

            <div className={`field ${styles.fullRow}`}>
              <label className="label" htmlFor="a-line">
                آدرس محلی <span className="req">*</span>
              </label>
              <textarea
                id="a-line"
                className="textarea"
                placeholder="خیابان، کوچه، پلاک، واحد..."
                value={form.line}
                onChange={(e) => setForm({ ...form, line: e.target.value })}
              />
              {fieldErrors.line && <span className="fieldError">{fieldErrors.line}</span>}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'افزودن آدرس'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* ---------------- فهرست آدرس‌ها ---------------- */}
      {addresses.length === 0 && !formOpen ? (
        <EmptyState
          icon="📍"
          title="هنوز آدرسی ثبت نکرده‌اید"
          description="برای دریافت سریع‌تر سفارش‌ها، آدرس خود را اضافه کنید."
        />
      ) : (
        <div className={styles.list}>
          {addresses.map((a) => (
            <article key={a.id} className={styles.addressCard}>
              <div className={styles.addressHead}>
                <strong>
                  {a.receiverName}
                  {a.isDefault && <span className={styles.defaultBadge}>پیش‌فرض</span>}
                </strong>
                <span dir="ltr" className="muted">{a.receiverPhone}</span>
              </div>
              <p className={styles.addressLine}>
                {a.province}، {a.city}، {a.line}
              </p>
              <p className="muted" dir="ltr" style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                {a.postalCode}
              </p>
              <div className={styles.addressActions}>
                {!a.isDefault && (
                  <button type="button" className={styles.smallBtn} onClick={() => makeDefault(a.id)}>
                    ⭐ پیش‌فرض کن
                  </button>
                )}
                <button type="button" className={styles.smallBtn} onClick={() => openEdit(a)}>
                  ✏️ ویرایش
                </button>
                <button
                  type="button"
                  className={`${styles.smallBtn} ${styles.deleteBtn}`}
                  onClick={() => remove(a.id)}
                >
                  🗑 حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
