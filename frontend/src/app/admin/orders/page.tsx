'use client';

// ===================================================================
// مدیریت سفارش‌ها: فیلتر وضعیت، تغییر وضعیت، کد رهگیری و وضعیت پرداخت
// ===================================================================

import { Fragment, useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import {
  formatDateTime,
  formatNumber,
  formatPrice,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'در انتظار بررسی' },
  { value: 'confirmed', label: 'تأیید شده' },
  { value: 'shipped', label: 'ارسال شده' },
  { value: 'delivered', label: 'تحویل شده' },
  { value: 'cancelled', label: 'لغو شده' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [trackingInputs, setTrackingInputs] = useState<Record<number, string>>({});

  const load = useCallback(async (status: string) => {
    setError('');
    try {
      // سقف limit در بک‌اند ۶۰ است
      const qs = status !== 'all' ? `?status=${status}&limit=60` : '?limit=60';
      const data = await apiGet<{ items: Order[] }>(`/api/orders${qs}`);
      setOrders(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت سفارش‌ها');
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  async function updateOrder(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    setActionError('');
    try {
      await apiPatch(`/api/orders/${id}`, body);
      await load(statusFilter);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'خطا در به‌روزرسانی سفارش');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>مدیریت سفارش‌ها</h1>

      <div className={styles.filterRow}>
        <label className="label" htmlFor="status-filter" style={{ margin: 0 }}>
          فیلتر وضعیت:
        </label>
        <select
          id="status-filter"
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">همه</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {actionError && <p className="formError">{actionError}</p>}
      {error && <ErrorBox message={error} onRetry={() => load(statusFilter)} />}

      {orders === null ? (
        <Loading />
      ) : orders.length === 0 ? (
        <p className="muted">سفارشی با این وضعیت وجود ندارد.</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>مشتری</th>
                <th>مبلغ</th>
                <th>پرداخت</th>
                <th>تاریخ</th>
                <th>وضعیت</th>
                <th>کد رهگیری</th>
                <th>جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr>
                    <td>
                      <strong>{formatNumber(o.id)}</strong>
                    </td>
                    <td>
                      {o.receiverName}
                      <br />
                      <small className={styles.subText} dir="ltr">{o.receiverPhone}</small>
                    </td>
                    <td>{formatPrice(o.totalAmount)}</td>
                    <td>
                      <span className={`badge badge-${o.paymentStatus}`}>
                        {paymentStatusLabel(o.paymentStatus)}
                      </span>
                      <br />
                      <small className={styles.subText}>
                        {paymentMethodLabel(o.paymentMethod)}
                      </small>
                    </td>
                    <td className={styles.subText}>{formatDateTime(o.createdAt)}</td>
                    <td>
                      <select
                        className="select"
                        style={{ width: 'auto', padding: '5px 8px', fontSize: '0.8rem' }}
                        value={o.status}
                        disabled={busyId === o.id}
                        onChange={(e) => updateOrder(o.id, { status: e.target.value })}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          className="input"
                          dir="ltr"
                          style={{ width: 110, padding: '5px 8px', fontSize: '0.8rem' }}
                          placeholder="—"
                          value={trackingInputs[o.id] ?? o.trackingCode ?? ''}
                          onChange={(e) =>
                            setTrackingInputs((prev) => ({ ...prev, [o.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className={styles.editBtn}
                          disabled={busyId === o.id}
                          onClick={() =>
                            updateOrder(o.id, {
                              trackingCode: trackingInputs[o.id] ?? o.trackingCode ?? '',
                            })
                          }
                        >
                          ثبت
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                        >
                          {expanded === o.id ? 'بستن' : 'مشاهده'}
                        </button>
                        {o.paymentStatus === 'unpaid' && o.status !== 'cancelled' && (
                          <button
                            type="button"
                            className={styles.editBtn}
                            disabled={busyId === o.id}
                            onClick={() => updateOrder(o.id, { paymentStatus: 'paid' })}
                          >
                            تأیید پرداخت
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr>
                      <td colSpan={8} style={{ background: 'var(--color-bg)' }}>
                        <div className={styles.detailGrid}>
                          <div>
                            <h4>اقلام سفارش</h4>
                            <ul>
                              {(o.items ?? []).map((it) => (
                                <li key={it.id}>
                                  {it.partName ?? `#${it.partId}`} —{' '}
                                  {formatNumber(it.quantity)} × {formatPrice(it.unitPrice)}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4>آدرس تحویل</h4>
                            <p>
                              {o.province}، {o.city}
                            </p>
                            <p>{o.addressLine}</p>
                            <p dir="ltr" style={{ textAlign: 'right' }}>{o.postalCode}</p>
                          </div>
                          <div>
                            <h4>صورتحساب</h4>
                            <p>کالاها: {formatPrice(o.itemsSubtotal)}</p>
                            <p>ارسال: {formatPrice(o.shippingCost)}</p>
                            {o.discountAmount > 0 && (
                              <p>
                                تخفیف {o.couponCode ? `(${o.couponCode})` : ''}:{' '}
                                −{formatPrice(o.discountAmount)}
                              </p>
                            )}
                            <p>
                              <strong>جمع: {formatPrice(o.totalAmount)}</strong>
                            </p>
                          </div>
                          {o.note && (
                            <div>
                              <h4>یادداشت مشتری</h4>
                              <p>{o.note}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
