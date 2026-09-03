'use client';

// ===================================================================
// فهرست محصولات با فیلترهای کامل — همه فیلترها در URL همگام هستند
// تا صفحه قابل اشتراک‌گذاری و بازگشت (back) باشد
// ===================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { formatNumber, SORT_OPTIONS } from '@/lib/format';
import type { Brand, Category, Paginated, PartListItem } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import Breadcrumbs from '@/components/Breadcrumbs';
import { EmptyState, ErrorBox, Loading } from '@/components/States';
import styles from './products.module.css';

const PAGE_SIZE = 12;

export default function ProductsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // مقادیر فیلتر از URL
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const brand = searchParams.get('brand') ?? '';
  const model = searchParams.get('model') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const inStock = searchParams.get('inStock') === '1';
  const onDiscount = searchParams.get('onDiscount') === '1';
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? 1) || 1;

  const [tree, setTree] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [result, setResult] = useState<Paginated<PartListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceInput, setPriceInput] = useState({ min: minPrice, max: maxPrice });

  // بارگذاری دسته‌بندی‌ها و برندها (یک‌بار)
  useEffect(() => {
    apiGet<Category[]>('/api/categories/tree')
      .then(setTree)
      .catch(() => setTree([]));
    apiGet<Brand[]>('/api/brands?withModels=1')
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  // بارگذاری محصولات هنگام تغییر فیلترها
  const loadParts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (brand) params.set('brand', brand);
      if (model) params.set('carModelId', model);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (inStock) params.set('inStock', '1');
      if (onDiscount) params.set('onDiscount', '1');
      if (sort !== 'newest') params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));

      const data = await apiGet<Paginated<PartListItem>>(
        `/api/parts?${params.toString()}`,
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت محصولات');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [q, category, brand, model, minPrice, maxPrice, inStock, onDiscount, sort, page]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  // همگام‌سازی ورودی قیمت با URL
  useEffect(() => {
    setPriceInput({ min: minPrice, max: maxPrice });
  }, [minPrice, maxPrice]);

  // به‌روزرسانی یک پارامتر در URL (صفحه به ۱ برمی‌گردد مگر خود page)
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      if (key !== 'page') params.delete('page');
      const qs = params.toString();
      router.replace(qs ? `/products?${qs}` : '/products', { scroll: false });
      setFiltersOpen(false);
    },
    [router, searchParams],
  );

  const applyPrice = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (priceInput.min) params.set('minPrice', priceInput.min);
    else params.delete('minPrice');
    if (priceInput.max) params.set('maxPrice', priceInput.max);
    else params.delete('maxPrice');
    params.delete('page');
    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : '/products', { scroll: false });
  };

  // نام دسته/برند/مدل فعال برای عنوان صفحه
  const activeCategory = useMemo(() => {
    if (!category) return null;
    for (const c of tree) {
      if (c.slug === category) return c;
      const child = (c.children ?? []).find((ch) => ch.slug === category);
      if (child) return child;
    }
    return null;
  }, [tree, category]);

  const activeBrand = brands.find((b) => b.slug === brand) ?? null;
  const activeModel = activeBrand?.models?.find((m) => String(m.id) === model) ?? null;

  const hasActiveFilters =
    Boolean(q || category || brand || model || minPrice || maxPrice || inStock || onDiscount);

  const title = q
    ? `نتایج جست‌وجو برای «${q}»`
    : activeCategory
      ? activeCategory.name
      : activeModel
        ? `قطعات ${activeModel.name}`
        : activeBrand
          ? `قطعات ${activeBrand.name}`
          : 'همه محصولات';

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: 'خانه', href: '/' },
          { label: 'محصولات', href: '/products' },
          ...(activeCategory ? [{ label: activeCategory.name }] : []),
        ]}
      />

      <div className={styles.layout}>
        {/* ---------------- ستون فیلترها ---------------- */}
        <aside
          className={`${styles.filters} ${filtersOpen ? styles.filtersOpen : ''}`}
          aria-label="فیلترهای محصولات"
        >
          <div className={styles.filtersHead}>
            <h2>فیلترها</h2>
            {hasActiveFilters && (
              <button
                type="button"
                className={styles.clearAll}
                onClick={() => router.replace('/products', { scroll: false })}
              >
                حذف همه
              </button>
            )}
          </div>

          {/* دسته‌بندی‌ها */}
          <section className={styles.filterGroup}>
            <h3>دسته‌بندی</h3>
            <button
              type="button"
              className={`${styles.filterLink} ${!category ? styles.active : ''}`}
              onClick={() => setParam('category', null)}
            >
              همه دسته‌ها
            </button>
            {tree.map((cat) => (
              <div key={cat.id}>
                <button
                  type="button"
                  className={`${styles.filterLink} ${styles.parentLink} ${category === cat.slug ? styles.active : ''}`}
                  onClick={() => setParam('category', cat.slug)}
                >
                  {cat.iconEmoji} {cat.name}
                </button>
                {(cat.children ?? []).map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    className={`${styles.filterLink} ${styles.childLink} ${category === child.slug ? styles.active : ''}`}
                    onClick={() => setParam('category', child.slug)}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            ))}
          </section>

          {/* برند و مدل خودرو */}
          <section className={styles.filterGroup}>
            <h3>برند خودرو</h3>
            <button
              type="button"
              className={`${styles.filterLink} ${!brand ? styles.active : ''}`}
              onClick={() => {
                setParam('brand', null);
                setParam('model', null);
              }}
            >
              همه برندها
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`${styles.filterLink} ${brand === b.slug ? styles.active : ''}`}
                onClick={() => {
                  setParam('model', null);
                  setParam('brand', b.slug);
                }}
              >
                {b.name}
                {typeof b.partsCount === 'number' && (
                  <span className={styles.count}>({formatNumber(b.partsCount)})</span>
                )}
              </button>
            ))}
          </section>

          {/* مدل خودرو (وقتی برند انتخاب شده) */}
          {activeBrand?.models?.length ? (
            <section className={styles.filterGroup}>
              <h3>مدل خودرو</h3>
              <button
                type="button"
                className={`${styles.filterLink} ${!model ? styles.active : ''}`}
                onClick={() => setParam('model', null)}
              >
                همه مدل‌ها
              </button>
              {activeBrand.models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.filterLink} ${model === String(m.id) ? styles.active : ''}`}
                  onClick={() => setParam('model', String(m.id))}
                >
                  {m.name}
                </button>
              ))}
            </section>
          ) : null}

          {/* بازه قیمت */}
          <section className={styles.filterGroup}>
            <h3>بازه قیمت (تومان)</h3>
            <div className={styles.priceInputs}>
              <input
                type="number"
                className={styles.priceInput}
                placeholder="از"
                min={0}
                dir="ltr"
                value={priceInput.min}
                onChange={(e) => setPriceInput((p) => ({ ...p, min: e.target.value }))}
                aria-label="حداقل قیمت"
              />
              <input
                type="number"
                className={styles.priceInput}
                placeholder="تا"
                min={0}
                dir="ltr"
                value={priceInput.max}
                onChange={(e) => setPriceInput((p) => ({ ...p, max: e.target.value }))}
                aria-label="حداکثر قیمت"
              />
            </div>
            <button type="button" className="btn btn-outline" onClick={applyPrice}>
              اعمال قیمت
            </button>
          </section>

          {/* سایر فیلترها */}
          <section className={styles.filterGroup}>
            <h3>سایر</h3>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setParam('inStock', e.target.checked ? '1' : null)}
              />
              فقط کالاهای موجود
            </label>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={onDiscount}
                onChange={(e) => setParam('onDiscount', e.target.checked ? '1' : null)}
              />
              فقط تخفیف‌دارها
            </label>
          </section>
        </aside>

        {/* ---------------- ستون نتایج ---------------- */}
        <div className={styles.results}>
          <div className={styles.toolbar}>
            <div className={styles.titleBox}>
              <h1>{title}</h1>
              {result && (
                <span className={styles.resultCount}>
                  {formatNumber(result.total)} کالا
                </span>
              )}
            </div>
            <div className={styles.toolbarActions}>
              <button
                type="button"
                className={styles.filterToggle}
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                ⚙ فیلترها
              </button>
              <label className={styles.sortBox}>
                <span className={styles.sortLabel}>مرتب‌سازی:</span>
                <select
                  className={styles.sortSelect}
                  value={sort}
                  onChange={(e) => setParam('sort', e.target.value === 'newest' ? null : e.target.value)}
                  aria-label="مرتب‌سازی"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {q && (
            <button
              type="button"
              className={styles.activeFilterChip}
              onClick={() => setParam('q', null)}
            >
              جست‌وجو: «{q}» ✕
            </button>
          )}

          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorBox message={error} onRetry={loadParts} />
          ) : !result || result.items.length === 0 ? (
            <EmptyState
              title="محصولی با این مشخصات پیدا نشد"
              description="فیلترها را تغییر دهید یا عبارت دیگری جست‌وجو کنید."
              action={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => router.replace('/products', { scroll: false })}
                >
                  نمایش همه محصولات
                </button>
              }
            />
          ) : (
            <>
              <div className="productGrid">
                {result.items.map((part) => (
                  <ProductCard key={part.id} part={part} />
                ))}
              </div>
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                basePath="/products"
                query={{
                  q: q || undefined,
                  category: category || undefined,
                  brand: brand || undefined,
                  model: model || undefined,
                  minPrice: minPrice || undefined,
                  maxPrice: maxPrice || undefined,
                  inStock: inStock ? '1' : undefined,
                  onDiscount: onDiscount ? '1' : undefined,
                  sort: sort !== 'newest' ? sort : undefined,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
