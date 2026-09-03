'use client';

// ===================================================================
// مدیریت بنرهای صفحه اصلی
// ===================================================================

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { imageUrl } from '@/lib/format';
import type { Banner } from '@/lib/types';
import { ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

const emptyForm = {
  title: '',
  subtitle: '',
  imageUrl: '/images/banners/hero-1.svg',
  linkUrl: '/products',
  placement: 'hero' as 'hero' | 'strip',
  sortOrder: '0',
  isActive: true,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      // نقطه پایانی عمومی فقط بنرهای فعال را می‌دهد؛ برای ادمین همه لازم است
      setBanners(await apiGet<Banner[]>('/api/banners?all=1'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت بنرها');
      setBanners([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (form.title.trim().length < 2) {
      setFormError('عنوان بنر را وارد کنید');
      return;
    }
    const body = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      imageUrl: form.imageUrl.trim(),
      linkUrl: form.linkUrl.trim() || '/products',
      placement: form.placement,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editingId) await apiPut(`/api/banners/${editingId}`, body);
      else await apiPost('/api/banners', body);
      setMsg(editingId ? 'بنر به‌روزرسانی شد.' : 'بنر ساخته شد.');
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ذخیره بنر');
    }
  }

  async function remove(id: number, title: string) {
    if (!window.confirm(`بنر «${title}» حذف شود؟`)) return;
    try {
      await apiDelete(`/api/banners/${id}`);
      setMsg('بنر حذف شد.');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در حذف بنر');
    }
  }

  if (banners === null) return <Loading />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>مدیریت بنرها</h1>

      {msg && <p className="formSuccess">{msg}</p>}

      <form className={styles.formCard} onSubmit={submit} noValidate>
        <h2>{editingId ? `ویرایش بنر #${editingId}` : 'بنر جدید'}</h2>
        {formError && <p className="formError">{formError}</p>}

        <div className={styles.grid3}>
          <div className="field">
            <label className="label">عنوان *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">زیرعنوان</label>
            <input
              className="input"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">جایگاه *</label>
            <select
              className="select"
              value={form.placement}
              onChange={(e) =>
                setForm({ ...form, placement: e.target.value as 'hero' | 'strip' })
              }
            >
              <option value="hero">اسلایدر اصلی</option>
              <option value="strip">نوار میانی</option>
            </select>
          </div>
          <div className="field">
            <label className="label">آدرس تصویر *</label>
            <input
              className="input"
              dir="ltr"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">لینک</label>
            <input
              className="input"
              dir="ltr"
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">ترتیب</label>
            <input
              className="input"
              dir="ltr"
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/\D/g, '') })}
            />
          </div>
        </div>

        {form.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(form.imageUrl)}
            alt="پیش‌نمایش بنر"
            style={{ width: 320, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
          />
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', marginTop: 8 }}>
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
            {editingId ? 'ذخیره تغییرات' : 'افزودن بنر'}
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
              <th>پیش‌نمایش</th>
              <th>عنوان</th>
              <th>جایگاه</th>
              <th>لینک</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {banners.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>بنری ثبت نشده است.</td>
              </tr>
            )}
            {banners.map((b) => (
              <tr key={b.id}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(b.imageUrl)}
                    alt={b.title}
                    style={{ width: 110, height: 34, objectFit: 'cover', borderRadius: 6 }}
                  />
                </td>
                <td>
                  <strong>{b.title}</strong>
                  {b.subtitle && (
                    <>
                      <br />
                      <small className={styles.subText}>{b.subtitle}</small>
                    </>
                  )}
                </td>
                <td>{b.placement === 'hero' ? 'اسلایدر' : 'نوار'}</td>
                <td dir="ltr" className={styles.subText}>{b.linkUrl}</td>
                <td>
                  <span className={`badge ${b.isActive ? 'badge-delivered' : 'badge-cancelled'}`}>
                    {b.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => {
                        setForm({
                          title: b.title,
                          subtitle: b.subtitle ?? '',
                          imageUrl: b.imageUrl,
                          linkUrl: b.linkUrl ?? '/products',
                          placement: (b.placement as 'hero' | 'strip') ?? 'hero',
                          sortOrder: String(b.sortOrder),
                          isActive: b.isActive,
                        });
                        setEditingId(b.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => remove(b.id, b.title)}
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
