'use client';

// ===================================================================
// سفارش‌های من: فهرست با جزئیات، وضعیت پرداخت و امکان لغو سفارش
// ===================================================================

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import {
  formatDateTime,
  formatPrice,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from '@/lib/format';
import type { Order } from '@/lib/types';
import { EmptyState, ErrorBox, Loading } from '@/components/States';
import styles from './orders.module.css';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      // پاسخ به‌صورت صفحه‌بندی‌شده است؛ همه صفحات کاربر معمولاً کم است
      const data = await apiGet<{ items: Order[] }>('/api/orders/mine?limit=50');
      setOrders(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت سفارش‌ها');
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancelOrder(id: number) {
    setActionError('');
    if (!window.confirm(`سفارش #${id} لغو شود؟ این عمل قابل بازگشت نیست.`)) return;
    setCancelId(id);
    try {
      await apiPatch(`/api/orders/${id}/cancel`);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'خطا در لغو سفارش');
    } finally {
      setCancelId(null);
    }
  }

  if (orders === null) return <Loading />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>سفارش‌های من</h1>

      {error && <ErrorBox message={error} onRetry={load} />}
      {actionError && <p className="formError">{actionError}</p>}

      {orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="هنوز سفارشی ثبت نکرده‌اید"
          description="اولین خرید خود را از فروشگاه انجام دهید."
          action={
            <Link href="/products" className="btn btn-primary">
              رفتن به فروشگاه
            </Link>
          }
        />
      ) : (
        <div className={styles.list}>
          {orders.map((order) => {
            const canCancel =
              order.status === 'pending' || order.status === 'confirmed';
            const isOpen = expanded === order.id;

            return (
              <article key={order.id} className={styles.orderCard}>
                <button
                  type="button"
                  className={styles.orderHead}
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.orderId}>
                    سفارش #{order.id.toLocaleString('fa-IR')}
                  </span>
                  <span className={`badge badge-${order.status}`}>
                    {orderStatusLabel(order.status)}
                  </span>
                  <span className={`badge badge-${order.paymentStatus}`}>
                    {paymentStatusLabel(order.paymentStatus)}
                  </span>
                  <span className={styles.date}>{formatDateTime(order.createdAt)}</span>
                  <strong className={styles.amount}>
                    {formatPrice(order.totalAmount)}
                  </strong>
                  <span className={styles.chevron}>{isOpen ? '▴' : '▾'}</span>
                </button>

                {isOpen && (
                  <div className={styles.orderBody}>
                    <div className={styles.bodyGrid}>
                      <div>
                        <h4>اقلام سفارش</h4>
                        <ul>
                          {(order.items ?? []).map((item) => (
                            <li key={item.id}>
                              {item.partSlug ? (
                                <Link href={`/products/${item.partSlug}`} className={styles.partLink}>
                                  {item.partName ?? `قطعه #${item.partId}`}
                                </Link>
                              ) : (
                                (item.partName ?? `قطعه #${item.partId}`)
                              )}
                              <span className={styles.itemQty}>
                                {' '}
                                {item.quantity.toLocaleString('fa-IR')} عدد ×{' '}
                                {formatPrice(item.unitPrice)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4>اطلاعات ارسال</h4>
                        <p>{order.receiverName}</p>
                        <p dir="ltr" style={{ textAlign: 'right' }}>{order.receiverPhone}</p>
                        <p className="muted">
                          {order.province}، {order.city}، {order.addressLine}
                        </p>
                        <p className="muted" dir="ltr" style={{ textAlign: 'right' }}>
                          {order.postalCode}
                        </p>
                      </div>

                      <div>
                        <h4>صورتحساب</h4>
                        <div className={styles.billRow}>
                          <span>جمع کالاها</span>
                          <span>{formatPrice(order.itemsSubtotal)}</span>
                        </div>
                        <div className={styles.billRow}>
                          <span>هزینه ارسال</span>
                          <span>
                            {order.shippingCost === 0 ? 'رایگان' : formatPrice(order.shippingCost)}
                          </span>
                        </div>
                        {order.discountAmount > 0 && (
                          <div className={`${styles.billRow} ${styles.discountRow}`}>
                            <span>تخفیف {order.couponCode ? `(${order.couponCode})` : ''}</span>
                            <span>−{formatPrice(order.discountAmount)}</span>
                          </div>
                        )}
                        <div className={`${styles.billRow} ${styles.totalRow}`}>
                          <span>مبلغ کل</span>
                          <span>{formatPrice(order.totalAmount)}</span>
                        </div>
                        <p className="muted" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                          روش پرداخت: {paymentMethodLabel(order.paymentMethod)}
                        </p>
                        {order.trackingCode && (
                          <p style={{ fontSize: '0.8rem' }}>
                            کد رهگیری پستی:{' '}
                            <strong dir="ltr">{order.trackingCode}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {order.note && (
                      <p className={styles.note}>📝 یادداشت: {order.note}</p>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        className={`btn btn-danger ${styles.cancelBtn}`}
                        onClick={() => cancelOrder(order.id)}
                        disabled={cancelId === order.id}
                      >
                        {cancelId === order.id ? 'در حال لغو...' : 'لغو سفارش'}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
