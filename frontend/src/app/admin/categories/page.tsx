'use client';

// ===================================================================
// مدیریت دسته‌بندی‌ها (ادمین)
// -------------------------------------------------------------------
// افزودن، ویرایش و حذف دسته‌بندی قطعات.
// ===================================================================

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { Category } from '@/lib/types';
import s from '../shared.module.css';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setCategories(await apiGet<Category[]>('/api/categories'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت دسته‌ها');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setMsg('');
    setError('');
  }

  function reset() {
    setEditingId(null);
    setName('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      if (editingId) {
        await apiPut(`/api/categories/${editingId}`, { name });
        setMsg('دسته ویرایش شد.');
      } else {
        await apiPost('/api/categories', { name });
        setMsg('دسته جدید افزوده شد.');
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره دسته');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('حذف این دسته؟')) return;
    try {
      await apiDelete(`/api/categories/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف دسته');
    }
  }

  return (
    <div>
      <h1 className={s.title}>{editingId ? 'ویرایش دسته' : 'افزودن دسته جدید'}</h1>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 420 }}>
        <div className="field">
          <label className="label">نام دسته</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className={s.formActions}>
          <button type="submit" className="btn btn-primary">
            {editingId ? 'ذخیره تغییرات' : 'افزودن'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="btn btn-secondary">
              انصراف
            </button>
          )}
        </div>
        {msg && <p className={s.rowMsg} style={{ color: 'var(--color-success)' }}>{msg}</p>}
        {error && <p className="text-danger">{error}</p>}
      </form>

      <h2 className={s.title} style={{ marginTop: '2rem' }}>
        لیست دسته‌ها
      </h2>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>نام دسته</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>
                  <div className={s.actions}>
                    <button
                      className={`${s.btnSm} ${s.editBtn}`}
                      onClick={() => startEdit(cat)}
                    >
                      ویرایش
                    </button>
                    <button
                      className={`${s.btnSm} ${s.delBtn}`}
                      onClick={() => handleDelete(cat.id)}
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
