'use client';

// ===================================================================
// مدیریت دسته‌بندی‌ها: ساخت/ویرایش/حذف با والد و آیکون
// ===================================================================

import { Fragment, useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import type { Category } from '@/lib/types';
import { ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

const emptyForm = { name: '', slug: '', parentId: '', iconEmoji: '', sortOrder: '0', isActive: true };

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState<Category[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setTree(await apiGet<Category[]>('/api/categories/tree?all=1'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت دسته‌بندی‌ها');
      setTree([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // همه دسته‌ها به‌صورت مساردار برای select والد
  const flat: { id: number; label: string }[] = [];
  const walk = (cats: Category[], depth: number) => {
    for (const c of cats) {
      flat.push({ id: c.id, label: `${'— '.repeat(depth)}${c.name}` });
      if (c.children?.length) walk(c.children, depth + 1);
    }
  };
  if (tree) walk(tree, 0);

  function openEdit(cat: Category) {
    setForm({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId ? String(cat.parentId) : '',
      iconEmoji: cat.iconEmoji ?? '',
      sortOrder: String(cat.sortOrder),
      isActive: cat.isActive,
    });
    setEditingId(cat.id);
    setFormError('');
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (form.name.trim().length < 2) {
      setFormError('نام دسته را وارد کنید');
      return;
    }
    const body = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      parentId: form.parentId ? Number(form.parentId) : null,
      iconEmoji: form.iconEmoji.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (editingId) await apiPut(`/api/categories/${editingId}`, body);
      else await apiPost('/api/categories', body);
      setMsg(editingId ? 'دسته‌بندی به‌روزرسانی شد.' : 'دسته‌بندی ساخته شد.');
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ذخیره دسته‌بندی');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`دسته «${name}» حذف شود؟`)) return;
    try {
      await apiDelete(`/api/categories/${id}`);
      setMsg('دسته حذف شد.');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حذف ممکن نشد؛ ابتدا زیردسته‌ها یا قطعات آن را منتقل کنید');
    }
  }

  const renderRow = (cat: Category, depth: number) => (
    <tr key={cat.id}>
      <td>
        <span style={{ paddingRight: depth * 18 }}>
          {cat.iconEmoji} {cat.name}
        </span>
      </td>
      <td dir="ltr" className={styles.subText}>{cat.slug}</td>
      <td>{(cat.children ?? []).length ? `${(cat.children ?? []).length} زیردسته` : '—'}</td>
      <td>
        <span className={`badge ${cat.isActive ? 'badge-delivered' : 'badge-cancelled'}`}>
          {cat.isActive ? 'فعال' : 'غیرفعال'}
        </span>
      </td>
      <td>
        <div className={styles.rowActions}>
          <button type="button" className={styles.editBtn} onClick={() => openEdit(cat)}>
            ویرایش
          </button>
          <button type="button" className={styles.deleteBtn} onClick={() => remove(cat.id, cat.name)}>
            حذف
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>مدیریت دسته‌بندی‌ها</h1>

      {msg && <p className="formSuccess">{msg}</p>}

      <form className={styles.formCard} onSubmit={submit} noValidate>
        <h2>{editingId ? `ویرایش دسته #${editingId}` : 'دسته جدید'}</h2>
        {formError && <p className="formError">{formError}</p>}

        <div className={styles.grid3}>
          <div className="field">
            <label className="label">نام *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            <label className="label">دسته والد</label>
            <select
              className="select"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">— دسته اصلی —</option>
              {flat
                .filter((f) => f.id !== editingId)
                .map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
            </select>
          </div>
          <div className="field">
            <label className="label">آیکون (ایموجی)</label>
            <input
              className="input"
              placeholder="🔧"
              value={form.iconEmoji}
              onChange={(e) => setForm({ ...form, iconEmoji: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">ترتیب نمایش</label>
            <input
              className="input"
              dir="ltr"
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/\D/g, '') })}
            />
          </div>
          <div className="field">
            <label className="label">وضعیت</label>
            <label className={styles.checkRow} style={{ margin: 0 }}>
              <input
                type="checkbox"
                style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              فعال
            </label>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'افزودن دسته'}
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

      {tree === null ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>نام</th>
                <th>اسلاگ</th>
                <th>فرزندان</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {tree.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>دسته‌ای ثبت نشده است.</td>
                </tr>
              )}
              {tree.map((cat) => (
                <Fragment key={cat.id}>
                  {renderRow(cat, 0)}
                  {(cat.children ?? []).map((child) => renderRow(child, 1))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
