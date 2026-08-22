'use client';

// ===================================================================
// کارت قطعه
// -------------------------------------------------------------------
// نمایش خلاصه یک قطعه در لیست. شامل نام، مدل خودرو، قیمت و دکمه جزئیات.
// ===================================================================

import Link from 'next/link';
import type { Part } from '@/lib/types';
import styles from './PartCard.module.css';

// قالب‌بندی عدد به‌صورت فارسی با جداکننده هزارگان (تومان)
function formatPrice(price: number): string {
  return price.toLocaleString('fa-IR');
}

export default function PartCard({ part }: { part: Part }) {
  return (
    <Link href={`/parts/${part.id}`} className={styles.card}>
      <div className={styles.top}>
        {/* اگر عکس نبود، یک آیکن پیش‌فرض نشان بده */}
        {part.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={part.imageUrl} alt={part.name} className={styles.image} />
        ) : (
          <div className={styles.placeholder}>⚙️</div>
        )}
      </div>

      <div className={styles.body}>
        {part.categoryName && (
          <span className={styles.category}>{part.categoryName}</span>
        )}
        <h3 className={styles.name}>{part.name}</h3>
        {part.carModel && (
          <p className={styles.model}>🚗 {part.carModel}</p>
        )}
        <div className={styles.footer}>
          <span className={styles.price}>{formatPrice(part.price)} تومان</span>
          <span
            className={
              part.stock > 0 ? styles.stockOk : styles.stockOut
            }
          >
            {part.stock > 0 ? 'موجود' : 'ناموجود'}
          </span>
        </div>
      </div>
    </Link>
  );
}
