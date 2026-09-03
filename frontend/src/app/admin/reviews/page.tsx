'use client';

// ===================================================================
// مدیریت نظرات: تأیید/رد/حذف با پیش‌نمایش
// ===================================================================

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Review } from '@/lib/types';
import { RatingStars } from '@/components/RatingStars';
import { ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (status: string) => {
    setError('');
    try {
      setReviews(await apiGet<Review[]>(`/api/reviews?status=${status}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت نظرات');
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  async function setStatus(id: number, status: 'approved' | 'rejected') {
    setBusyId(id);
    try {
      await apiPatch(`/api/reviews/${id}`, { status });
      setMsg(status === 'approved' ? 'نظر تأیید و منتشر شد.' : 'نظر رد شد.');
      await load(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر وضعیت نظر');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (!window.confirm('این نظر برای همیشه حذف شود؟')) return;
    setBusyId(id);
    try {
      await apiDelete(`/api/reviews/${id}`);
      setMsg('نظر حذف شد.');
      await load(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف نظر');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>مدیریت نظرات</h1>

      <div className={styles.filterRow}>
        <label className="label" htmlFor="review-filter" style={{ margin: 0 }}>
          وضعیت:
        </label>
        <select
          id="review-filter"
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">در انتظار تأیید</option>
          <option value="approved">تأییدشده</option>
          <option value="rejected">ردشده</option>
          <option value="all">همه</option>
        </select>
      </div>

      {msg && <p className="formSuccess">{msg}</p>}
      {error && <ErrorBox message={error} onRetry={() => load(statusFilter)} />}

      {reviews === null ? (
        <Loading />
      ) : reviews.length === 0 ? (
        <p className="muted">نظری با این وضعیت وجود ندارد.</p>
      ) : (
        <div className={styles.reviewList}>
          {reviews.map((r) => (
            <article key={r.id} className={styles.reviewCard}>
              <header className={styles.reviewHead}>
                <strong>
                  {r.userName} {r.userLastName}
                </strong>
                <RatingStars value={r.rating} />
                <span className={`badge badge-${r.status === 'approved' ? 'delivered' : r.status === 'rejected' ? 'cancelled' : 'pending'}`}>
                  {r.status === 'approved' ? 'تأییدشده' : r.status === 'rejected' ? 'ردشده' : 'در انتظار'}
                </span>
                <span className={styles.subText}>{formatDateTime(r.createdAt)}</span>
              </header>
              {r.partName && r.partSlug && (
                <p className={styles.subText}>
                  برای محصول:{' '}
                  <Link href={`/products/${r.partSlug}`} className={styles.nameLink}>
                    {r.partName}
                  </Link>
                </p>
              )}
              <p className={styles.reviewText}>{r.comment}</p>
              <div className={styles.rowActions}>
                {r.status !== 'approved' && (
                  <button
                    type="button"
                    className={styles.editBtn}
                    disabled={busyId === r.id}
                    onClick={() => setStatus(r.id, 'approved')}
                  >
                    ✓ تأیید و انتشار
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button
                    type="button"
                    className={styles.editBtn}
                    disabled={busyId === r.id}
                    onClick={() => setStatus(r.id, 'rejected')}
                  >
                    ✗ رد
                  </button>
                )}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  disabled={busyId === r.id}
                  onClick={() => remove(r.id)}
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
