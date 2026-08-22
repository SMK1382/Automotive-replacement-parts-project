'use client';

// ===================================================================
// داشبورد ادمین
// -------------------------------------------------------------------
// چند آمار کلی (تعداد قطعات، سفارش‌ها، کاربران) را نشان می‌دهد.
// ===================================================================

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Part, Order, User } from '@/lib/types';
import styles from './page.module.css';

function formatNumber(n: number): string {
  return n.toLocaleString('fa-IR');
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    parts: 0,
    orders: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // گرفتن همزمان سه لیست و شمارش آن‌ها
    Promise.all([
      apiGet<Part[]>('/api/parts'),
      apiGet<Order[]>('/api/orders'),
      apiGet<User[]>('/api/users'),
    ])
      .then(([parts, orders, users]) => {
        setStats({
          parts: parts.length,
          orders: orders.length,
          users: users.length,
        });
      })
      .catch(() => {
        // خطا را نادیده می‌گیریم و صفر نشان می‌دهیم
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">در حال بارگذاری...</p>;

  return (
    <div>
      <h1 className={styles.title}>داشبورد</h1>

      <div className={styles.grid}>
        <div className="card">
          <div className={styles.statValue}>{formatNumber(stats.parts)}</div>
          <div className={styles.statLabel}>تعداد قطعات</div>
        </div>
        <div className="card">
          <div className={styles.statValue}>{formatNumber(stats.orders)}</div>
          <div className={styles.statLabel}>تعداد سفارش‌ها</div>
        </div>
        <div className="card">
          <div className={styles.statValue}>{formatNumber(stats.users)}</div>
          <div className={styles.statLabel}>تعداد کاربران</div>
        </div>
      </div>
    </div>
  );
}
