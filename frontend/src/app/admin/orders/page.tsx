'use client';

// ===================================================================
// مدیریت سفارش‌ها (ادمین)
// -------------------------------------------------------------------
// همه سفارش‌ها را نشان می‌دهد و امکان تغییر وضعیت هر سفارش را می‌دهد.
// ===================================================================

import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import type { Order } from '@/lib/types';
import s from '../shared.module.css';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'در انتظار' },
  { value: 'confirmed', label: 'تایید شده' },
  { value: 'delivered', label: 'تحویل شده' },
  { value: 'cancelled', label: 'لغو شده' },
];

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
}

function formatPrice(price: number): string {
  return price.toLocaleString('fa-IR');
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setOrders(await apiGet<Order[]>('/api/orders'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت سفارش‌ها');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // تغییر وضعیت یک سفارش
  async function changeStatus(id: number, status: string) {
    try {
      await apiPatch(`/api/orders/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر وضعیت');
    }
  }

  if (loading) return <p className="muted">در حال بارگذاری...</p>;

  return (
    <div>
      <h1 className={s.title}>مدیریت سفارش‌ها</h1>
      {error && <p className="text-danger">{error}</p>}

      {orders.length === 0 ? (
        <div className="card">
          <p className="muted">هنوز سفارشی ثبت نشده است.</p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>شماره</th>
                <th>مشتری</th>
                <th>تعداد آیتم</th>
                <th>مبلغ کل</th>
                <th>وضعیت فعلی</th>
                <th>تغییر وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.user ? order.user.name : `کاربر #${order.userId}`}</td>
                  <td>{order.items ? order.items.length : 0}</td>
                  <td>{formatPrice(order.totalAmount)}</td>
                  <td>
                    <span className={`badge badge-${order.status}`}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td>
                    <select
                      className="select"
                      value={order.status}
                      onChange={(e) => changeStatus(order.id, e.target.value)}
                      style={{ width: 'auto' }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
