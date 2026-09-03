// ===================================================================
// صفحه‌بندی — با حفظ query string فعلی صفحه
// ===================================================================

import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import styles from './Pagination.module.css';

interface Props {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}

function pageHref(basePath: string, page: number, query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v) params.set(k, v);
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function Pagination({ page, totalPages, basePath, query }: Props) {
  if (totalPages <= 1) return null;

  // حداکثر ۵ شماره صفحه اطراف صفحه فعلی
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav className={styles.pagination} aria-label="صفحه‌بندی">
      {page > 1 ? (
        <Link href={pageHref(basePath, page - 1, query)} className={styles.btn} aria-label="صفحه قبل">
          → قبلی
        </Link>
      ) : (
        <span className={`${styles.btn} ${styles.disabled}`}>→ قبلی</span>
      )}

      {start > 1 && (
        <>
          <Link href={pageHref(basePath, 1, query)} className={styles.btn}>۱</Link>
          {start > 2 && <span className={styles.ellipsis}>…</span>}
        </>
      )}

      {pages.map((p) =>
        p === page ? (
          <span key={p} className={`${styles.btn} ${styles.current}`} aria-current="page">
            {formatNumber(p)}
          </span>
        ) : (
          <Link key={p} href={pageHref(basePath, p, query)} className={styles.btn}>
            {formatNumber(p)}
          </Link>
        ),
      )}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className={styles.ellipsis}>…</span>}
          <Link href={pageHref(basePath, totalPages, query)} className={styles.btn}>
            {formatNumber(totalPages)}
          </Link>
        </>
      )}

      {page < totalPages ? (
        <Link href={pageHref(basePath, page + 1, query)} className={styles.btn} aria-label="صفحه بعد">
          بعدی ←
        </Link>
      ) : (
        <span className={`${styles.btn} ${styles.disabled}`}>بعدی ←</span>
      )}
    </nav>
  );
}
