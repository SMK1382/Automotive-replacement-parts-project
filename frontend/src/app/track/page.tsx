'use client';

// ===================================================================
// پیگیری سفارش (عمومی) — با شماره سفارش و شماره موبایل ثبت‌شده
// ===================================================================

import { useState } from 'react';
import { apiGet } from '@/lib/api';
import {
  formatDateTime,
  formatPrice,
  orderStatusLabel,
  paymentStatusLabel,
} from '@/lib/format';
import styles from './track.module.css';

interface TrackResult {
  id: number;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  trackingCode: string | null;
  createdAt: string;
}

// مراحل پیشرفت سفارش برای نمایش مرحله‌ای
const STEPS: { key: string; label: string; icon: string }[] = [
  { key: 'pending', label: 'ثبت سفارش', icon: '📝' },
  { key: 'confirmed', label: 'تأیید و آماده‌سازی', icon: '✅' },
  { key: 'shipped', label: 'ارسال', icon: '🚚' },
  { key: 'delivered', label: 'تحویل', icon: '🏠' },
];

export default function TrackPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await apiGet<TrackResult>(
        `/api/orders/track?id=${encodeURIComponent(orderId.trim())}&phone=${encodeURIComponent(phone.trim())}`,
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'سفارشی با این مشخصات پیدا نشد');
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = result
    ? result.status === 'cancelled'
      ? -1
      : STEPS.findIndex((s) => s.key === result.status)
    : -1;

  return (
    <div className={styles.page}>
      <div className={styles.box}>
        <h1>🚚 پیگیری سفارش</h1>
        <p className="muted">
          شماره سفارش و شماره موبایلی که هنگام ثبت سفارش وارد کرده‌اید را
          بنویسید.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="field">
            <label className="label" htmlFor="track-id">
              شماره سفارش <span className="req">*</span>
            </label>
            <input
              id="track-id"
              className="input"
              dir="ltr"
              inputMode="numeric"
              placeholder="مثلاً 12"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="track-phone">
              شماره موبایل <span className="req">*</span>
            </label>
            <input
              id="track-phone"
              className="input"
              dir="ltr"
              inputMode="numeric"
              placeholder="09123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'در حال جست‌وجو...' : 'پیگیری'}
          </button>
        </form>

        {error && <p className="formError">{error}</p>}

        {result && (
          <div className={styles.result}>
            <div className={styles.resultHead}>
              <strong>سفارش #{result.id.toLocaleString('fa-IR')}</strong>
              <span className={`badge badge-${result.status}`}>
                {orderStatusLabel(result.status)}
              </span>
              <span className={`badge badge-${result.paymentStatus}`}>
                {paymentStatusLabel(result.paymentStatus)}
              </span>
            </div>

            {result.status === 'cancelled' ? (
              <p className={styles.cancelled}>
                این سفارش لغو شده است. در صورت پرداخت، مبلغ تا ۷۲ ساعت آینده
                بازگشت داده می‌شود.
              </p>
            ) : (
              <ol className={styles.steps}>
                {STEPS.map((step, i) => (
                  <li
                    key={step.key}
                    className={i <= stepIndex ? styles.stepDone : ''}
                    aria-current={i === stepIndex ? 'step' : undefined}
                  >
                    <span className={styles.stepIcon} aria-hidden="true">{step.icon}</span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className={styles.meta}>
              <span>تاریخ ثبت: {formatDateTime(result.createdAt)}</span>
              <span>مبلغ کل: {formatPrice(result.totalAmount)}</span>
              {result.trackingCode && (
                <span>
                  کد رهگیری پستی: <strong dir="ltr">{result.trackingCode}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
