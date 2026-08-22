'use client';

// ===================================================================
// مدیریت قطعات (ادمین)
// -------------------------------------------------------------------
// - لیست قطعات در یک جدول
// - فرم افزودن قطعه جدید (یا ویرایش قطعه انتخاب‌شده)
// - دکمه ویرایش و حذف برای هر ردیف
// ===================================================================

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { Part, Category } from '@/lib/types';
import s from '../shared.module.css';

// شکل فرم قطعه
type PartForm = {
  name: string;
  description: string;
  price: string; // در فرم به‌صورت متن نگه می‌داریم
  stock: string;
  partNumber: string;
  carModel: string;
  imageUrl: string;
  categoryId: string;
};

// فرم خالی برای افزودن
const emptyForm: PartForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  partNumber: '',
  carModel: '',
  imageUrl: '',
  categoryId: '',
};

function formatPrice(price: number): string {
  return price.toLocaleString('fa-IR');
}

export default function AdminPartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<PartForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // گرفتن لیست قطعات و دسته‌ها
  async function load() {
    try {
      const [p, c] = await Promise.all([
        apiGet<Part[]>('/api/parts'),
        apiGet<Category[]>('/api/categories'),
      ]);
      setParts(p);
      setCategories(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت داده‌ها');
    }
  }

  useEffect(() => {
    load();
  }, []);

  // وقتی روی «ویرایش» کلیک می‌شود، فرم با اطلاعات آن قطعه پر می‌شود
  function startEdit(part: Part) {
    setEditingId(part.id);
    setForm({
      name: part.name,
      description: part.description || '',
      price: String(part.price),
      stock: String(part.stock),
      partNumber: part.partNumber || '',
      carModel: part.carModel || '',
      imageUrl: part.imageUrl || '',
      categoryId: part.categoryId ? String(part.categoryId) : '',
    });
    setMsg('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  // ذخیره (افزودن یا ویرایش)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');

    // تبدیل مقادیر فرم به ساختار مورد انتظار بک‌اند
    const body = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      partNumber: form.partNumber || undefined,
      carModel: form.carModel || undefined,
      imageUrl: form.imageUrl || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
    };

    try {
      if (editingId) {
        await apiPut(`/api/parts/${editingId}`, body);
        setMsg('قطعه با موفقیت ویرایش شد.');
      } else {
        await apiPost('/api/parts', body);
        setMsg('قطعه جدید با موفقیت افزوده شد.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره قطعه');
    } finally {
      setSaving(false);
    }
  }

  // حذف قطعه
  async function handleDelete(id: number) {
    if (!confirm('آیا از حذف این قطعه مطمئن هستید؟')) return;
    try {
      await apiDelete(`/api/parts/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف قطعه');
    }
  }

  // به‌روزرسانی یک فیلد فرم
  function setField(key: keyof PartForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <h1 className={s.title}>{editingId ? 'ویرایش قطعه' : 'افزودن قطعه جدید'}</h1>

      {/* فرم افزودن/ویرایش */}
      <form onSubmit={handleSubmit} className="card">
        <div className={s.form}>
          <div className="field">
            <label className="label">نام قطعه</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label">کد فنی</label>
            <input
              className="input"
              value={form.partNumber}
              onChange={(e) => setField('partNumber', e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="field">
            <label className="label">قیمت (تومان)</label>
            <input
              className="input"
              type="number"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              required
              dir="ltr"
            />
          </div>

          <div className="field">
            <label className="label">موجودی انبار</label>
            <input
              className="input"
              type="number"
              value={form.stock}
              onChange={(e) => setField('stock', e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="field">
            <label className="label">مدل خودرو</label>
            <input
              className="input"
              value={form.carModel}
              onChange={(e) => setField('carModel', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">دسته‌بندی</label>
            <select
              className="select"
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
            >
              <option value="">— انتخاب دسته —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`field ${s.formFull}`}>
            <label className="label">آدرس تصویر (اختیاری)</label>
            <input
              className="input"
              value={form.imageUrl}
              onChange={(e) => setField('imageUrl', e.target.value)}
              dir="ltr"
            />
          </div>

          <div className={`field ${s.formFull}`}>
            <label className="label">توضیحات</label>
            <textarea
              className="textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className={s.formActions}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'افزودن قطعه'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                انصراف
              </button>
            )}
          </div>
        </div>

        {msg && <p style={{ color: 'var(--color-success)' }}>{msg}</p>}
        {error && <p className="text-danger">{error}</p>}
      </form>

      {/* جدول قطعات */}
      <h2 className={s.title} style={{ marginTop: '2rem' }}>
        لیست قطعات ({parts.length.toLocaleString('fa-IR')})
      </h2>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>نام</th>
              <th>مدل خودرو</th>
              <th>قیمت</th>
              <th>موجودی</th>
              <th>دسته</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id}>
                <td>{part.name}</td>
                <td>{part.carModel || '—'}</td>
                <td>{formatPrice(part.price)}</td>
                <td>{part.stock.toLocaleString('fa-IR')}</td>
                <td>{part.categoryName || '—'}</td>
                <td>
                  <div className={s.actions}>
                    <button
                      className={`${s.btnSm} ${s.editBtn}`}
                      onClick={() => startEdit(part)}
                    >
                      ویرایش
                    </button>
                    <button
                      className={`${s.btnSm} ${s.delBtn}`}
                      onClick={() => handleDelete(part.id)}
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
