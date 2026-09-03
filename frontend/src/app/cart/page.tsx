'use client';

// ===================================================================
// سبد خرید: فهرست اقلام، تغییر تعداد، حذف و خلاصه پرداخت
// ===================================================================

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { apiGet } from '@/lib/api';
import { formatPrice, imageUrl } from '@/lib/format';
import { EmptyState } from '@/components/States';
import styles from './cart.module.css';

interface ShopSettings {
  shippingCost: number;
  freeShippingThreshold: number;
}

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clear } = useCart();
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  useEffect(() => {
    apiGet<ShopSettings>('/api/settings')
      .then(setSettings)
      .catch(() =>
        setSettings({ shippingCost: 0, freeShippingThreshold: 0 }),
      );
  }, []);

  const shipping =
    subtotal <= 0 || !settings
      ? 0
      : subtotal >= settings.freeShippingThreshold
        ? 0
        : settings.shippingCost;
  const total = subtotal + shipping;
  const remainingForFree = settings
    ? Math.max(0, settings.freeShippingThreshold - subtotal)
    : 0;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>🛒 سبد خرید شما</h1>
        <EmptyState
          icon="🛒"
          title="سبد خرید خالی است"
          description="از صفحه محصولات، قطعات موردنیاز خود را به سبد اضافه کنید."
          action={
            <Link href="/products" className="btn btn-primary">
              رفتن به فروشگاه
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>🛒 سبد خرید شما</h1>
        <button type="button" className={styles.clearBtn} onClick={clear}>
          خالی کردن سبد
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.itemsList}>
          {items.map((item) => {
            const unit = item.discountPrice ?? item.price;
            const lineTotal = unit * item.quantity;
            return (
              <div key={item.partId} className={styles.itemRow}>
                <Link href={`/products/${item.slug}`} className={styles.itemImage}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(item.imageUrl)} alt={item.name} />
                  ) : (
                    <span aria-hidden="true">⚙️</span>
                  )}
                </Link>

                <div className={styles.itemInfo}>
                  <Link href={`/products/${item.slug}`} className={styles.itemName}>
                    {item.name}
                  </Link>
                  <span className={styles.itemUnit}>
                    {formatPrice(unit)} / {item.unit}
                  </span>
                  {item.quantity >= item.stock && (
                    <span className={styles.stockNote}>
                      حداکثر موجودی: {item.stock.toLocaleString('fa-IR')}
                    </span>
                  )}
                </div>

                <div className={styles.itemControls}>
                  <div className={styles.quantityBox}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.partId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      aria-label="افزایش"
                    >
                      +
                    </button>
                    <span>{item.quantity.toLocaleString('fa-IR')}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.partId, item.quantity - 1)}
                      aria-label="کاهش"
                    >
                      −
                    </button>
                  </div>
                  <strong className={styles.lineTotal}>{formatPrice(lineTotal)}</strong>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeItem(item.partId)}
                    aria-label={`حذف ${item.name}`}
                    title="حذف"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <aside className={styles.summary}>
          <h2>خلاصه سفارش</h2>

          {remainingForFree > 0 && settings && settings.freeShippingThreshold > 0 && (
            <p className={styles.freeShipHint}>
              🚚 {formatPrice(remainingForFree)} دیگر خرید کنید تا ارسال رایگان شود.
            </p>
          )}

          <div className={styles.summaryRow}>
            <span>جمع کالاها</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>هزینه ارسال</span>
            <span>{shipping === 0 ? 'رایگان' : formatPrice(shipping)}</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span>مبلغ قابل پرداخت</span>
            <span>{formatPrice(total)}</span>
          </div>

          <Link href="/checkout" className={`${styles.checkoutBtn} btn btn-primary btn-large`}>
            ادامه فرآیند خرید ←
          </Link>
          <Link href="/products" className={styles.continueLink}>
            ادامه خرید
          </Link>
        </aside>
      </div>
    </div>
  );
}
