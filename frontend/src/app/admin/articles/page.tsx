'use client';

// ===================================================================
// مدیریت مقالات بلاگ
// ===================================================================

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { formatDate, imageUrl } from '@/lib/format';
import type { Article } from '@/lib/types';
import { ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '/images/articles/blog-1.svg',
  isPublished: false,
};

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiGet<{ items: Article[] }>('/api/articles?limit=60&all=1');
      setArticles(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت مقالات');
      setArticles([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (form.title.trim().length < 3) {
      setFormError('عنوان مقاله را وارد کنید');
      return;
    }
    if (form.excerpt.trim().length < 10) {
      setFormError('خلاصه مقاله باید حداقل ۱۰ حرف باشد');
      return;
    }
    if (form.content.trim().length < 50) {
      setFormError('متن مقاله باید حداقل ۵۰ حرف باشد');
      return;
    }
    const body = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
      coverImage: form.coverImage.trim() || null,
      isPublished: form.isPublished,
    };
    setSaving(true);
    try {
      if (editingId) await apiPut(`/api/articles/${editingId}`, body);
      else await apiPost('/api/articles', body);
      setMsg(editingId ? 'مقاله به‌روزرسانی شد.' : 'مقاله ساخته شد.');
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ذخیره مقاله');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number, title: string) {
    if (!window.confirm(`مقاله «${title}» حذف شود؟`)) return;
    try {
      await apiDelete(`/api/articles/${id}`);
      setMsg('مقاله حذف شد.');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در حذف مقاله');
    }
  }

  if (articles === null) return <Loading />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>مدیریت مقالات</h1>

      {msg && <p className="formSuccess">{msg}</p>}

      <form className={styles.formCard} onSubmit={submit} noValidate>
        <h2>{editingId ? `ویرایش مقاله #${editingId}` : 'مقاله جدید'}</h2>
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
            <label className="label">اسلاگ (اختیاری)</label>
            <input
              className="input"
              dir="ltr"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">تصویر شاخص</label>
            <input
              className="input"
              dir="ltr"
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label className="label">خلاصه *</label>
          <textarea
            className="textarea"
            style={{ minHeight: 70 }}
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            required
          />
        </div>

        <div className="field">
          <label className="label">متن کامل مقاله *</label>
          <textarea
            className="textarea"
            style={{ minHeight: 220 }}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />
        </div>

        {form.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(form.coverImage)}
            alt="پیش‌نمایش"
            style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
          />
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', marginTop: 8 }}>
          <input
            type="checkbox"
            style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
            checked={form.isPublished}
            onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
          />
          منتشرشده (عمومی)
        </label>

        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'افزودن مقاله'}
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
              <th>عنوان</th>
              <th>اسلاگ</th>
              <th>تاریخ</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyCell}>مقاله‌ای ثبت نشده است.</td>
              </tr>
            )}
            {articles.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.title}</strong>
                  <br />
                  <small className={styles.subText}>{a.excerpt.slice(0, 60)}…</small>
                </td>
                <td dir="ltr" className={styles.subText}>{a.slug}</td>
                <td className={styles.subText}>{formatDate(a.createdAt)}</td>
                <td>
                  <span className={`badge ${a.isPublished ? 'badge-delivered' : 'badge-pending'}`}>
                    {a.isPublished ? 'منتشرشده' : 'پیش‌نویس'}
                  </span>
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => {
                        setForm({
                          title: a.title,
                          slug: a.slug,
                          excerpt: a.excerpt,
                          content: a.content,
                          coverImage: a.coverImage ?? '',
                          isPublished: a.isPublished,
                        });
                        setEditingId(a.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => remove(a.id, a.title)}
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
