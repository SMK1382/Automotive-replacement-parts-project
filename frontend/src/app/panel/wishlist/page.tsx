'use client';

// ===================================================================
// علاقه‌مندی‌ها: فهرست قطعات نشان‌شده با امکان حذف و افزودن به سبد
// ===================================================================

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { apiDelete, apiGet } from '@/lib/api';
import { formatPrice, imageUrl } from '@/lib/format';
import type { PartListItem } from '@/lib/types';
import { EmptyState, ErrorBox, Loading } from '@/components/States';
import styles from './wishlist.module.css';

export default function WishlistPage() {
  const { addItem } = useCart();
  const [items, setItems] = useState<PartListItem[] | null>(null);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiGet<PartListItem[]>('/api/wishlist');
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت علاقه‌مندی‌ها');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(partId: number) {
    setRemoving(partId);
    try {
      await apiDelete(`/api/wishlist/${partId}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف از علاقه‌مندی‌ها');
    } finally {
      setRemoving(null);
    }
  }

  if (items === null) return <Loading />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>علاقه‌مندی‌های من</h1>

      {error && <ErrorBox message={error} onRetry={load} />}

      {items.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="فهرست علاقه‌مندی‌ها خالی است"
          description="در صفحه محصول با کلیک روی ❤️ قطعات را برای بعد ذخیره کنید."
          action={
            <Link href="/products" className="btn btn-primary">
              مشاهده محصولات
            </Link>
          }
        />
      ) : (
        <div className={styles.list}>
          {items.map((part) => (
            <article key={part.id} className={styles.row}>
              <Link href={`/products/${part.slug}`} className={styles.image}>
                {part.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(part.imageUrl)} alt={part.name} />
                ) : (
                  <span aria-hidden="true">⚙️</span>
                )}
              </Link>

              <div className={styles.info}>
                <Link href={`/products/${part.slug}`} className={styles.name}>
                  {part.name}
                </Link>
                <span className={styles.price}>
                  {formatPrice(part.discountPrice ?? part.price)}
                </span>
                <span className={part.stock > 0 ? styles.inStock : styles.outStock}>
                  {part.stock > 0 ? 'موجود' : 'ناموجود'}
                </span>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={part.stock <= 0}
                  onClick={() => addItem(part, 1)}
                >
                  🛒 افزودن به سبد
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => remove(part.id)}
                  disabled={removing === part.id}
                  aria-label={`حذف ${part.name} از علاقه‌مندی‌ها`}
                >
                  {removing === part.id ? '...' : '🗑 حذف'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
