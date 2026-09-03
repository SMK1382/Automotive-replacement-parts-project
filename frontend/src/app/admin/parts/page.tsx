'use client';

// ===================================================================
// مدیریت قطعات: جست‌وجو، فهرست، ساخت/ویرایش با تصاویر و سازگاری، حذف
// ===================================================================

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { formatNumber, formatPrice, imageUrl } from '@/lib/format';
import type { Brand, Category, Compatibility, PartDetail, PartListItem, ProductImage } from '@/lib/types';
import { ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

interface CarModelOption {
  id: number;
  name: string;
  brandName: string;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  price: string;
  discountPrice: string;
  stock: string;
  partNumber: string;
  weightGrams: string;
  unit: string;
  categoryId: string;
  brandId: string;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  images: { url: string; alt: string }[];
  compatibility: { carModelId: string; yearsNote: string; engineCode: string }[];
}

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  price: '',
  discountPrice: '',
  stock: '0',
  partNumber: '',
  weightGrams: '',
  unit: 'عدد',
  categoryId: '',
  brandId: '',
  isActive: true,
  isFeatured: false,
  metaTitle: '',
  metaDescription: '',
  images: [],
  compatibility: [],
};

export default function AdminPartsPage() {
  const [list, setList] = useState<PartListItem[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [loadingSlow, setLoadingSlow] = useState(false);

  const [tree, setTree] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allModels, setAllModels] = useState<CarModelOption[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q: string) => {
    setLoadingSlow(true);
    setError('');
    try {
      const params = new URLSearchParams({ all: '1', limit: '50', sort: 'newest' });
      if (q) params.set('q', q);
      const data = await apiGet<{ items: PartListItem[] }>(`/api/parts?${params}`);
      setList(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت قطعات');
      setList([]);
    } finally {
      setLoadingSlow(false);
    }
  }, []);

  useEffect(() => {
    load('');
    apiGet<Category[]>('/api/categories/tree?all=1').then(setTree).catch(() => {});
    apiGet<Brand[]>('/api/brands?withModels=1&all=1').then(setBrands).catch(() => {});
    apiGet<CarModelOption[]>('/api/brands/car-models/all')
      .then(setAllModels)
      .catch(() => {});
  }, [load]);

  // گزینه‌های دسته به‌صورت مساردار برای select
  const categoryOptions: { id: number; label: string }[] = [];
  for (const cat of tree) {
    categoryOptions.push({ id: cat.id, label: cat.name });
    for (const child of cat.children ?? []) {
      categoryOptions.push({ id: child.id, label: `— ${child.name}` });
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
    setMsg('');
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function openEdit(id: number) {
    setMsg('');
    setFormError('');
    try {
      const part = await apiGet<PartDetail>(`/api/parts/${id}`);
      setForm({
        name: part.name,
        slug: part.slug,
        description: part.description ?? '',
        price: String(part.price),
        discountPrice: part.discountPrice != null ? String(part.discountPrice) : '',
        stock: String(part.stock),
        partNumber: part.partNumber ?? '',
        weightGrams: part.weightGrams != null ? String(part.weightGrams) : '',
        unit: part.unit,
        categoryId: part.categoryId ? String(part.categoryId) : '',
        brandId: part.brandId ? String(part.brandId) : '',
        isActive: part.isActive,
        isFeatured: part.isFeatured,
        metaTitle: part.metaTitle ?? '',
        metaDescription: part.metaDescription ?? '',
        images: (part.images ?? []).map((img: ProductImage) => ({
          url: img.url,
          alt: img.alt ?? '',
        })),
        compatibility: (part.compatibility ?? []).map((c: Compatibility) => ({
          carModelId: String(c.carModelId ?? ''),
          yearsNote: c.yearsNote ?? '',
          engineCode: c.engineCode ?? '',
        })),
      });
      setEditingId(id);
      setFormOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در دریافت قطعه');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setMsg('');

    const price = Number(form.price);
    const discount = form.discountPrice ? Number(form.discountPrice) : null;
    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError('نام قطعه را وارد کنید');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError('قیمت معتبر وارد کنید');
      return;
    }
    if (discount != null && (discount < 0 || discount >= price)) {
      setFormError('قیمت با تخفیف باید کمتر از قیمت اصلی باشد');
      return;
    }
    if (form.images.some((img) => !img.url.trim())) {
      setFormError('آدرس تصویر خالی مجاز نیست؛ آن ردیف را حذف کنید');
      return;
    }
    if (form.compatibility.some((c) => !c.carModelId)) {
      setFormError('مدل خودروی سازگار را برای همه ردیف‌ها انتخاب کنید');
      return;
    }

    const body = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      price,
      discountPrice: discount,
      stock: Number(form.stock) || 0,
      partNumber: form.partNumber.trim() || null,
      weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
      unit: form.unit || 'عدد',
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      brandId: form.brandId ? Number(form.brandId) : null,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      images: form.images.map((img) => ({
        url: img.url.trim(),
        alt: img.alt.trim() || null,
      })),
      compatibility: form.compatibility.map((c) => ({
        carModelId: Number(c.carModelId),
        yearsNote: c.yearsNote.trim() || '',
        engineCode: c.engineCode.trim() || null,
      })),
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/api/parts/${editingId}`, body);
        setMsg(`قطعه «${body.name}» به‌روزرسانی شد.`);
      } else {
        await apiPost('/api/parts', body);
        setMsg(`قطعه «${body.name}» ساخته شد.`);
      }
      setFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load(search);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ذخیره قطعه');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`قطعه «${name}» حذف شود؟`)) return;
    try {
      await apiDelete(`/api/parts/${id}`);
      setMsg('قطعه حذف شد.');
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف قطعه');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>مدیریت قطعات</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          ➕ قطعه جدید
        </button>
      </div>

      {msg && <p className="formSuccess">{msg}</p>}
      {formError && formOpen === false && <p className="formError">{formError}</p>}

      {/* ---------------- فرم ساخت/ویرایش ---------------- */}
      {formOpen && (
        <form className={styles.formCard} onSubmit={submit} noValidate>
          <h2>{editingId ? `ویرایش قطعه #${editingId}` : 'قطعه جدید'}</h2>
          {formError && <p className="formError">{formError}</p>}

          <div className={styles.grid3}>
            <div className="field">
              <label className="label">نام قطعه *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label className="label">اسلاگ (اختیاری — خالی=b خودکار)</label>
              <input
                className="input"
                dir="ltr"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">کد فنی</label>
              <input
                className="input"
                dir="ltr"
                value={form.partNumber}
                onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="label">قیمت (تومان) *</label>
              <input
                className="input"
                dir="ltr"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, '') })}
                required
              />
            </div>
            <div className="field">
              <label className="label">قیمت با تخفیف</label>
              <input
                className="input"
                dir="ltr"
                inputMode="numeric"
                value={form.discountPrice}
                onChange={(e) => setForm({ ...form, discountPrice: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="field">
              <label className="label">موجودی</label>
              <input
                className="input"
                dir="ltr"
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/\D/g, '') })}
              />
            </div>

            <div className="field">
              <label className="label">واحد فروش</label>
              <input
                className="input"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">وزن (گرم)</label>
              <input
                className="input"
                dir="ltr"
                inputMode="numeric"
                value={form.weightGrams}
                onChange={(e) => setForm({ ...form, weightGrams: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="field">
              <label className="label">دسته‌بندی</label>
              <select
                className="select"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">بدون دسته</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">برند</label>
              <select
                className="select"
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              >
                <option value="">بدون برند</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">عنوان سئو</label>
              <input
                className="input"
                value={form.metaTitle}
                onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">توضیح سئو</label>
              <input
                className="input"
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label className="label">توضیحات</label>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className={styles.checkRow}>
            <label>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              فعال (قابل نمایش در فروشگاه)
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              />
              محصول ویژه (نمایش در صفحه اصلی)
            </label>
          </div>

          {/* تصاویر */}
          <fieldset className={styles.subSection}>
            <legend>تصاویر ({formatNumber(form.images.length)})</legend>
            {form.images.length === 0 && (
              <p className={styles.subHint}>
                تصویری اضافه نشده؛ در فروشگاه جای‌نگهدار نمایش داده می‌شود.
              </p>
            )}
            {form.images.map((img, i) => (
              <div key={i} className={styles.subRow}>
                <input
                  className="input"
                  dir="ltr"
                  placeholder="/images/parts/example.svg یا URL کامل"
                  value={img.url}
                  onChange={(e) => {
                    const images = [...form.images];
                    images[i] = { ...img, url: e.target.value };
                    setForm({ ...form, images });
                  }}
                />
                <input
                  className="input"
                  placeholder="متن جایگزین (alt)"
                  value={img.alt}
                  onChange={(e) => {
                    const images = [...form.images];
                    images[i] = { ...img, alt: e.target.value };
                    setForm({ ...form, images });
                  }}
                />
                {img.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(img.url)}
                    alt=""
                    className={styles.subPreview}
                  />
                )}
                <button
                  type="button"
                  className={styles.subRemove}
                  onClick={() =>
                    setForm({ ...form, images: form.images.filter((_, j) => j !== i) })
                  }
                  aria-label="حذف تصویر"
                >
                  🗑
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                setForm({ ...form, images: [...form.images, { url: '', alt: '' }] })
              }
            >
              ➕ افزودن تصویر
            </button>
          </fieldset>

          {/* سازگاری */}
          <fieldset className={styles.subSection}>
            <legend>خودروهای سازگار ({formatNumber(form.compatibility.length)})</legend>
            {form.compatibility.map((c, i) => (
              <div key={i} className={styles.subRow}>
                <select
                  className="select"
                  value={c.carModelId}
                  onChange={(e) => {
                    const compatibility = [...form.compatibility];
                    compatibility[i] = { ...c, carModelId: e.target.value };
                    setForm({ ...form, compatibility });
                  }}
                >
                  <option value="">انتخاب مدل...</option>
                  {allModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brandName} {m.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="سال‌های ساخت (مثل ۱۳۹۰-۱۳۹۷)"
                  value={c.yearsNote}
                  onChange={(e) => {
                    const compatibility = [...form.compatibility];
                    compatibility[i] = { ...c, yearsNote: e.target.value };
                    setForm({ ...form, compatibility });
                  }}
                />
                <input
                  className="input"
                  dir="ltr"
                  placeholder="کد موتور (اختیاری)"
                  value={c.engineCode}
                  onChange={(e) => {
                    const compatibility = [...form.compatibility];
                    compatibility[i] = { ...c, engineCode: e.target.value };
                    setForm({ ...form, compatibility });
                  }}
                />
                <button
                  type="button"
                  className={styles.subRemove}
                  onClick={() =>
                    setForm({
                      ...form,
                      compatibility: form.compatibility.filter((_, j) => j !== i),
                    })
                  }
                  aria-label="حذف سازگاری"
                >
                  🗑
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                setForm({
                  ...form,
                  compatibility: [
                    ...form.compatibility,
                    { carModelId: '', yearsNote: '', engineCode: '' },
                  ],
                })
              }
            >
              ➕ افزودن خودرو
            </button>
          </fieldset>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'در حال ذخیره...' : editingId ? 'ذخیره تغییرات' : 'ساخت قطعه'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* ---------------- جست‌وجو ---------------- */}
      <form
        className={styles.searchBar}
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
      >
        <input
          className="input"
          placeholder="جست‌وجو بر اساس نام یا کد فنی..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">جست‌وجو</button>
      </form>

      {/* ---------------- فهرست ---------------- */}
      {list === null || loadingSlow ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => load(search)} />
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>نام</th>
                <th>دسته</th>
                <th>برند</th>
                <th>قیمت</th>
                <th>موجودی</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    قطعه‌ای یافت نشد.
                  </td>
                </tr>
              )}
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/products/${p.slug}`} className={styles.nameLink}>
                      {p.name}
                    </Link>
                    {p.partNumber && (
                      <small className={styles.subText} dir="ltr"> {p.partNumber}</small>
                    )}
                  </td>
                  <td>{p.categoryName ?? '—'}</td>
                  <td>{p.brandName ?? '—'}</td>
                  <td>
                    {p.discountPrice != null ? (
                      <>
                        <del className={styles.subText}>{formatPrice(p.price)}</del>{' '}
                        <strong>{formatPrice(p.discountPrice)}</strong>
                      </>
                    ) : (
                      formatPrice(p.price)
                    )}
                  </td>
                  <td className={p.stock === 0 ? 'text-danger' : ''}>
                    {formatNumber(p.stock)}
                  </td>
                  <td>
                    <span className={`badge ${p.isActive ? 'badge-delivered' : 'badge-cancelled'}`}>
                      {p.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                    {p.isFeatured && (
                      <span className="badge badge-confirmed" style={{ marginRight: 4 }}>
                        ویژه
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => openEdit(p.id)}
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => remove(p.id, p.name)}
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
      )}
    </div>
  );
}
