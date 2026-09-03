'use client';

// ===================================================================
// مدیریت برندها و مدل‌های خودرو
// ===================================================================

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { Brand } from '@/lib/types';
import { ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

interface CarModelRow {
  id: number;
  name: string;
  slug: string;
  brandId: number;
  brandName: string;
}

const emptyBrand = { name: '', slug: '', logoUrl: '', description: '', sortOrder: '0', isActive: true };
const emptyModel = { name: '', slug: '', brandId: '' };

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [models, setModels] = useState<CarModelRow[]>([]);
  const [error, setError] = useState('');

  const [brandForm, setBrandForm] = useState(emptyBrand);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [modelForm, setModelForm] = useState(emptyModel);
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [b, m] = await Promise.all([
        apiGet<Brand[]>('/api/brands?withModels=1&all=1'),
        apiGet<CarModelRow[]>('/api/brands/car-models/all'),
      ]);
      setBrands(b);
      setModels(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت برندها');
      setBrands([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitBrand(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (brandForm.name.trim().length < 2) {
      setFormError('نام برند را وارد کنید');
      return;
    }
    const body = {
      name: brandForm.name.trim(),
      slug: brandForm.slug.trim() || undefined,
      logoUrl: brandForm.logoUrl.trim() || null,
      description: brandForm.description.trim() || null,
      sortOrder: Number(brandForm.sortOrder) || 0,
      isActive: brandForm.isActive,
    };
    try {
      if (editingBrandId) await apiPut(`/api/brands/${editingBrandId}`, body);
      else await apiPost('/api/brands', body);
      setMsg(editingBrandId ? 'برند به‌روزرسانی شد.' : 'برند ساخته شد.');
      setBrandForm(emptyBrand);
      setEditingBrandId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ذخیره برند');
    }
  }

  async function submitModel(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (modelForm.name.trim().length < 2) {
      setFormError('نام مدل را وارد کنید');
      return;
    }
    if (!modelForm.brandId) {
      setFormError('برند مدل را انتخاب کنید');
      return;
    }
    const body = {
      name: modelForm.name.trim(),
      slug: modelForm.slug.trim() || undefined,
      brandId: Number(modelForm.brandId),
    };
    try {
      if (editingModelId) await apiPut(`/api/car-models/${editingModelId}`, body);
      else await apiPost('/api/car-models', body);
      setMsg(editingModelId ? 'مدل به‌روزرسانی شد.' : 'مدل ساخته شد.');
      setModelForm(emptyModel);
      setEditingModelId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ذخیره مدل');
    }
  }

  async function removeBrand(id: number, name: string) {
    if (!window.confirm(`برند «${name}» حذف شود؟`)) return;
    try {
      await apiDelete(`/api/brands/${id}`);
      setMsg('برند حذف شد.');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حذف برند ممکن نشد؛ ابتدا مدل‌ها یا قطعات آن را منتقل کنید');
    }
  }

  async function removeModel(id: number, name: string) {
    if (!window.confirm(`مدل «${name}» حذف شود؟`)) return;
    try {
      await apiDelete(`/api/car-models/${id}`);
      setMsg('مدل حذف شد.');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حذف مدل ممکن نشد؛ ابتدا سازگاری قطعات را اصلاح کنید');
    }
  }

  if (brands === null) return <Loading />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>مدیریت برندها و خودروها</h1>

      {msg && <p className="formSuccess">{msg}</p>}
      {formError && <p className="formError">{formError}</p>}
      {error && <ErrorBox message={error} onRetry={load} />}

      {/* ---------------- برند ---------------- */}
      <form className={styles.formCard} onSubmit={submitBrand} noValidate>
        <h2>{editingBrandId ? `ویرایش برند #${editingBrandId}` : 'برند جدید'}</h2>
        <div className={styles.grid3}>
          <div className="field">
            <label className="label">نام برند *</label>
            <input
              className="input"
              value={brandForm.name}
              onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">اسلاگ (اختیاری)</label>
            <input
              className="input"
              dir="ltr"
              value={brandForm.slug}
              onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">لوگو (URL، اختیاری)</label>
            <input
              className="input"
              dir="ltr"
              value={brandForm.logoUrl}
              onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">توضیح</label>
            <input
              className="input"
              value={brandForm.description}
              onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">ترتیب</label>
            <input
              className="input"
              dir="ltr"
              inputMode="numeric"
              value={brandForm.sortOrder}
              onChange={(e) =>
                setBrandForm({ ...brandForm, sortOrder: e.target.value.replace(/\D/g, '') })
              }
            />
          </div>
          <div className="field">
            <label className="label">وضعیت</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
                checked={brandForm.isActive}
                onChange={(e) => setBrandForm({ ...brandForm, isActive: e.target.checked })}
              />
              فعال
            </label>
          </div>
        </div>
        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary">
            {editingBrandId ? 'ذخیره تغییرات' : 'افزودن برند'}
          </button>
          {editingBrandId && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setBrandForm(emptyBrand);
                setEditingBrandId(null);
              }}
            >
              انصراف
            </button>
          )}
        </div>
      </form>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>برند</th>
              <th>اسلاگ</th>
              <th>تعداد قطعه</th>
              <th>مدل‌ها</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id}>
                <td><strong>{b.name}</strong></td>
                <td dir="ltr" className={styles.subText}>{b.slug}</td>
                <td>{formatNumber(b.partsCount ?? 0)}</td>
                <td className={styles.subText}>
                  {(b.models ?? []).map((m) => m.name).join('، ') || '—'}
                </td>
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
                        setBrandForm({
                          name: b.name,
                          slug: b.slug,
                          logoUrl: b.logoUrl ?? '',
                          description: b.description ?? '',
                          sortOrder: String(b.sortOrder),
                          isActive: b.isActive,
                        });
                        setEditingBrandId(b.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => removeBrand(b.id, b.name)}
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

      {/* ---------------- مدل خودرو ---------------- */}
      <form className={styles.formCard} onSubmit={submitModel} noValidate>
        <h2>{editingModelId ? `ویرایش مدل #${editingModelId}` : 'مدل خودرو جدید'}</h2>
        <div className={styles.grid3}>
          <div className="field">
            <label className="label">نام مدل *</label>
            <input
              className="input"
              placeholder="مثلاً کرولا"
              value={modelForm.name}
              onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">برند *</label>
            <select
              className="select"
              value={modelForm.brandId}
              onChange={(e) => setModelForm({ ...modelForm, brandId: e.target.value })}
              required
            >
              <option value="">انتخاب برند...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">اسلاگ (اختیاری)</label>
            <input
              className="input"
              dir="ltr"
              value={modelForm.slug}
              onChange={(e) => setModelForm({ ...modelForm, slug: e.target.value })}
            />
          </div>
        </div>
        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary">
            {editingModelId ? 'ذخیره تغییرات' : 'افزودن مدل'}
          </button>
          {editingModelId && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setModelForm(emptyModel);
                setEditingModelId(null);
              }}
            >
              انصراف
            </button>
          )}
        </div>
      </form>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>مدل</th>
              <th>برند</th>
              <th>اسلاگ</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.name}</strong></td>
                <td>{m.brandName}</td>
                <td dir="ltr" className={styles.subText}>{m.slug}</td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => {
                        setModelForm({ name: m.name, slug: m.slug, brandId: String(m.brandId) });
                        setEditingModelId(m.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => removeModel(m.id, m.name)}
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
