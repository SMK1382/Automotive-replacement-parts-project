'use client';

// ===================================================================
// صفحه سفارش‌های من
// -------------------------------------------------------------------
// سفارش‌های کاربر فعلی را از بک‌اند می‌گیرد و نمایش می‌دهد.
// ===================================================================

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Order } from '@/lib/types';
import styles from './page.module.css';

// برچسب فارسی وضعیت سفارش
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'در انتظار',
    confirmed: 'تایید شده',
    delivered: 'تحویل شده',
    cancelled: 'لغو شده',
  };
  return map[status] || status;
}

function formatPrice(price: number): string {
  return price.toLocaleString('fa-IR');
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<Order[]>('/api/orders/mine')
      .then(setOrders)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'خطا در دریافت سفارش‌ها'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">در حال بارگذاری...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div>
      <h1 className={styles.title}>سفارش‌های من</h1>

      {orders.length === 0 ? (
        <div className="card">
          <p className="muted">شما هنوز سفارشی ثبت نکرده‌اید.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <div key={order.id} className="card">
              <div className={styles.orderHeader}>
                <span className={styles.orderId}>سفارش #{order.id}</span>
                <span className={`badge badge-${order.status}`}>
                  {statusLabel(order.status)}
                </span>
              </div>

              {/* جزئیات آیتم‌ها */}
              {order.items && order.items.length > 0 && (
                <ul className={styles.items}>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      قطعه #{item.partId} — {item.quantity} عدد ×{' '}
                      {formatPrice(item.price)} تومان
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.total}>
                مبلغ کل: {formatPrice(order.totalAmount)} تومان
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
