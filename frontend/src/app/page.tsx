'use client';

// ===================================================================
// صفحه خانه
// -------------------------------------------------------------------
// شامل یک بخش معرفی (Hero) و لیست چند قطعه ویژه. داده‌ها از بک‌اند
// گرفته می‌شوند.
// ===================================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { Part } from '@/lib/types';
import PartCard from '@/components/PartCard';
import styles from './page.module.css';

export default function HomePage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // گرفتن لیست قطعات هنگام بارگذاری صفحه
  useEffect(() => {
    apiGet<Part[]>('/api/parts')
      .then((data) => setParts(data))
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, []);

  // ۶ قطعه اول به‌عنوان قطعات ویژه
  const featured = parts.slice(0, 6);

  return (
    <>
      {/* بخش معرفی */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>قطعات اصل خودروهای تویوتا</h1>
          <p className={styles.heroText}>
            فروشگاه آنلاین قطعات یدکی با کیفیت تضمینی و ارسال سریع به سراسر
            کشور. مدل‌های کرولا، کمری، یاریس، راو۴ و هیلوکس.
          </p>
          <Link href="/parts" className="btn btn-primary btn-large">
            مشاهده قطعات
          </Link>
        </div>
      </section>

      {/* بخش قطعات ویژه */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>قطعات ویژه</h2>
          <Link href="/parts" className={styles.viewAll}>
            مشاهده همه ←
          </Link>
        </div>

        {loading ? (
          <p className="muted">در حال بارگذاری قطعات...</p>
        ) : featured.length === 0 ? (
          <p className="muted">هنوز قطعه‌ای ثبت نشده است.</p>
        ) : (
          <div className={styles.grid}>
            {featured.map((part) => (
              <PartCard key={part.id} part={part} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
