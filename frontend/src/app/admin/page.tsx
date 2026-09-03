'use client';

// ===================================================================
// داشبورد مدیریت: آمار کلی، سفارش‌های اخیر و هشدار موجودی کم
// ===================================================================

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { formatDateTime, formatNumber, formatPrice, orderStatusLabel } from '@/lib/format';
import { ErrorBox, Loading } from '@/components/States';
import styles from './page.module.css';

interface Stats {
  users: number;
  activeParts: number;
  pendingReviews: number;
  unreadMessages: number;
  ordersByStatus: { status: string; count: number }[];
  totalRevenue: number;
  recentOrders: {
    id: number;
    status: string;
    totalAmount: number;
    createdAt: string;
    receiverName: string;
  }[];
  lowStock: { id: number; name: string; stock: number; slug: string }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  function load() {
    setError('');
    apiGet<Stats>('/api/admin/stats')
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'خطا در دریافت آمار'),
      );
  }

  useEffect(load, []);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!stats) return <Loading />;

  const ordersCount = stats.ordersByStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>داشبورد مدیریت</h1>

      {/* کارت‌های آماری */}
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">📦</span>
          <div>
            <strong>{formatNumber(stats.activeParts)}</strong>
            <span>قطعه فعال</span>
          </div>
          <Link href="/admin/parts" className={styles.statLink}>مدیریت ←</Link>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">🧾</span>
          <div>
            <strong>{formatNumber(ordersCount)}</strong>
            <span>سفارش</span>
          </div>
          <Link href="/admin/orders" className={styles.statLink}>مشاهده ←</Link>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">💰</span>
          <div>
            <strong>{formatPrice(stats.totalRevenue)}</strong>
            <span>درآمد تحویل‌شده</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">👥</span>
          <div>
            <strong>{formatNumber(stats.users)}</strong>
            <span>کاربر</span>
          </div>
          <Link href="/admin/users" className={styles.statLink}>مشاهده ←</Link>
        </div>
        {stats.pendingReviews > 0 && (
          <div className={`${styles.statCard} ${styles.alert}`}>
            <span className={styles.statIcon} aria-hidden="true">⭐</span>
            <div>
              <strong>{formatNumber(stats.pendingReviews)}</strong>
              <span>نظر در انتظار تأیید</span>
            </div>
            <Link href="/admin/reviews" className={styles.statLink}>بررسی ←</Link>
          </div>
        )}
        {stats.unreadMessages > 0 && (
          <div className={`${styles.statCard} ${styles.alert}`}>
            <span className={styles.statIcon} aria-hidden="true">✉️</span>
            <div>
              <strong>{formatNumber(stats.unreadMessages)}</strong>
              <span>پیام خوانده‌نشده</span>
            </div>
            <Link href="/admin/messages" className={styles.statLink}>مشاهده ←</Link>
          </div>
        )}
      </div>

      <div className={styles.twoCols}>
        {/* سفارش‌های اخیر */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>🧾 سفارش‌های اخیر</h2>
            <Link href="/admin/orders">همه ←</Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="muted">سفارشی ثبت نشده است.</p>
          ) : (
            <div className={styles.recentList}>
              {stats.recentOrders.map((o) => (
                <div key={o.id} className={styles.recentRow}>
                  <span className={styles.recentId}>#{formatNumber(o.id)}</span>
                  <span className={styles.recentName}>{o.receiverName}</span>
                  <span className={`badge badge-${o.status}`}>
                    {orderStatusLabel(o.status)}
                  </span>
                  <span className={styles.recentDate}>{formatDateTime(o.createdAt)}</span>
                  <strong>{formatPrice(o.totalAmount)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* موجودی کم */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>⚠️ موجودی کم (کمتر از ۵ عدد)</h2>
            <Link href="/admin/parts">مدیریت قطعات ←</Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <p className="muted">موجودی همه قطعات مناسب است.</p>
          ) : (
            <div className={styles.recentList}>
              {stats.lowStock.map((p) => (
                <div key={p.id} className={styles.recentRow}>
                  <Link href={`/products/${p.slug}`} className={styles.recentName}>
                    {p.name}
                  </Link>
                  <span className={styles.lowStockBadge}>
                    {formatNumber(p.stock)} عدد
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
