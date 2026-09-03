'use client';

// ===================================================================
// اسلایدر بنر اصلی — فقط بخش تعاملی (چرخش خودکار و نقطه‌های انتخاب)
// بنر اول بدون جاوااسکریپت هم در HTML هست تا صفحه سریع باز شود
// ===================================================================

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { imageUrl } from '@/lib/format';
import type { Banner } from '@/lib/types';
import styles from './page.module.css';

export default function HeroSlider({ banners }: { banners: Banner[] }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <section className={styles.hero}>
        <div className={styles.heroFallback}>
          <h1>قطعات یدکی اورجینال با ضمانت اصالت</h1>
          <p>جست‌وجوی سریع بر اساس مدل خودرو، ارسال به سراسر ایران</p>
          <Link href="/products" className="btn btn-primary btn-large">
            مشاهده محصولات
          </Link>
        </div>
      </section>
    );
  }

  const hero = banners[slide];

  return (
    <section className={styles.hero}>
      <Link href={hero.linkUrl || '/products'} className={styles.heroLink}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl(hero.imageUrl)}
          alt={hero.title}
          className={styles.heroImg}
          {...(slide === 0 ? {} : { loading: 'lazy' })}
        />
        <div className={styles.heroOverlay}>
          <h1>{hero.title}</h1>
          {hero.subtitle && <p>{hero.subtitle}</p>}
          <span className={styles.heroCta}>همین حالا خرید کنید ←</span>
        </div>
      </Link>

      {banners.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label="انتخاب بنر">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === slide}
              aria-label={b.title}
              className={`${styles.dot} ${i === slide ? styles.dotActive : ''}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
