'use client';

// ===================================================================
// صفحه لیست قطعات
// -------------------------------------------------------------------
// همه قطعات را نشان می‌دهد و یک کادر جستجو دارد. با تایپ در کادر،
// لیست بر اساس نام یا مدل خودرو فیلتر می‌شود.
// ===================================================================

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Part } from '@/lib/types';
import PartCard from '@/components/PartCard';
import styles from './page.module.css';

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // تابع گرفتن لیست قطعات (با یا بدون عبارت جستجو)
  async function loadParts(q: string) {
    setLoading(true);
    setError('');
    try {
      const query = q ? `?q=${encodeURIComponent(q)}` : '';
      const data = await apiGet<Part[]>(`/api/parts${query}`);
      setParts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت قطعات');
    } finally {
      setLoading(false);
    }
  }

  // بارگذاری اولیه
  useEffect(() => {
    loadParts('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // هنگام جستجو، پس از مکث کوتاه، درخواست می‌فرستیم (debounce ساده)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadParts(search);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>قطعات یدکی</h1>

      {/* کادر جستجو */}
      <div className={styles.searchBox}>
        <input
          type="text"
          className="input"
          placeholder="جستجو بر اساس نام قطعه یا مدل خودرو..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* وضعیت‌ها */}
      {error && <p className="text-danger">{error}</p>}
      {loading ? (
        <p className="muted">در حال بارگذاری...</p>
      ) : parts.length === 0 ? (
        <p className="muted">هیچ قطعه‌ای پیدا نشد.</p>
      ) : (
        <div className={styles.grid}>
          {parts.map((part) => (
            <PartCard key={part.id} part={part} />
          ))}
        </div>
      )}
    </div>
  );
}
