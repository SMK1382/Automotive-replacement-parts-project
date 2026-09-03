'use client';

// ===================================================================
// کارت استاندارد محصول — استفاده در فهرست‌ها، ویژه‌ها و مرتبط‌ها
// ===================================================================

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { discountPercent, formatPrice, formatNumber, imageUrl } from '@/lib/format';
import type { PartListItem } from '@/lib/types';
import { RatingStars } from './RatingStars';
import styles from './ProductCard.module.css';

export default function ProductCard({ part }: { part: PartListItem }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const off = discountPercent(part.price, part.discountPrice);
  const finalPrice = part.discountPrice ?? part.price;
  const inStock = part.stock > 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!inStock) return;
    addItem(part, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className={styles.card}>
      <Link href={`/products/${part.slug}`} className={styles.link}>
        <div className={styles.imageBox}>
          {part.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(part.imageUrl)}
              alt={part.name}
              className={styles.image}
              loading="lazy"
            />
          ) : (
            <span className={styles.placeholder} aria-hidden="true">⚙️</span>
          )}
          {off > 0 && <span className={styles.discountBadge}>٪{formatNumber(off)}</span>}
          {!inStock && <span className={styles.outBadge}>ناموجود</span>}
        </div>

        <div className={styles.body}>
          {part.categoryName && (
            <span className={styles.category}>{part.categoryName}</span>
          )}
          <h3 className={styles.name} title={part.name}>{part.name}</h3>

          {part.reviewCount > 0 ? (
            <div className={styles.ratingRow}>
              <RatingStars value={part.avgRating} />
              <span className={styles.ratingCount}>({formatNumber(part.reviewCount)})</span>
            </div>
          ) : (
            <div className={styles.brandRow}>{part.brandName}</div>
          )}

          <div className={styles.priceRow}>
            {off > 0 && <del className={styles.oldPrice}>{formatPrice(part.price)}</del>}
            <span className={styles.price}>{formatPrice(finalPrice)}</span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        className={`${styles.addBtn} ${added ? styles.added : ''} ${!inStock ? styles.disabled : ''}`}
        onClick={handleAdd}
        disabled={!inStock}
        aria-label={`افزودن ${part.name} به سبد خرید`}
      >
        {added ? '✓ به سبد اضافه شد' : inStock ? 'افزودن به سبد' : 'ناموجود'}
      </button>
    </article>
  );
}
