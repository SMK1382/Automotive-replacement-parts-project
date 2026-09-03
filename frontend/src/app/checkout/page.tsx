'use client';

// ===================================================================
// تسویه حساب: انتخاب آدرس (ذخیره‌شده یا جدید)، روش پرداخت،
// کد تخفیف و ثبت نهایی سفارش
// ===================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { apiGet, apiPost } from '@/lib/api';
import { formatPrice, imageUrl } from '@/lib/format';
import { IRAN_PROVINCES } from '@/lib/iran';
import type { Address, Order } from '@/lib/types';
import { EmptyState, Loading } from '@/components/States';
import styles from './checkout.module.css';

interface ShopSettings {
  shippingCost: number;
  freeShippingThreshold: number;
  shopCardNumber: string;
  shopCardHolder: string;
}

const emptyAddress = {
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  postalCode: '',
  line: '',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, clear } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState<number | 'new'>('new');
  const [address, setAddress] = useState(emptyAddress);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [paymentMethod, setPaymentMethod] = useState<'card_transfer' | 'cod'>('card_transfer');
  const [note, setNote] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // هدایت کاربر مهمان به ورود
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/checkout');
  }, [authLoading, user, router]);

  // بارگذاری آدرس‌ها و تنظیمات
  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiGet<Address[]>('/api/addresses').catch(() => [] as Address[]),
      apiGet<ShopSettings>('/api/settings').catch(() => null),
    ]).then(([addr, st]) => {
      setAddresses(addr);
      if (addr.length > 0) {
        const def = addr.find((a) => a.isDefault) ?? addr[0];
        setSelectedAddressId(def.id);
      }
      setSettings(st);
      setDataLoading(false);
    });
  }, [user]);

  const shipping =
    subtotal >= (settings?.freeShippingThreshold ?? Infinity)
      ? 0
      : (settings?.shippingCost ?? 0);
  const discount = couponDiscount;
  const total = Math.max(0, subtotal + shipping - discount);

  const provinces = Object.keys(IRAN_PROVINCES);
  const cities = address.province ? IRAN_PROVINCES[address.province] ?? [] : [];

  function validateAddress(): boolean {
    const errors: Record<string, string> = {};
    if (selectedAddressId !== 'new') return true;

    if (address.receiverName.trim().length < 2)
      errors.receiverName = 'نام و نام خانوادگی گیرنده را کامل وارد کنید';
    if (!/^09\d{9}$/.test(address.receiverPhone.trim()))
      errors.receiverPhone = 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد';
    if (!address.province) errors.province = 'استان را انتخاب کنید';
    if (!address.city) errors.city = 'شهر را انتخاب کنید';
    if (!/^\d{10}$/.test(address.postalCode.trim()))
      errors.postalCode = 'کد پستی باید دقیقاً ۱۰ رقم باشد';
    if (address.line.trim().length < 10)
      errors.line = 'آدرس محلی باید حداقل ۱۰ حرف باشد';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponMsg('');
    setCouponError('');
    try {
      const res = await apiPost<{ code: string; discount: number }>(
        '/api/coupons/validate',
        { code, subtotal },
      );
      setCouponDiscount(res.discount);
      setCouponMsg(`کد تخفیف «${res.code}» اعمال شد؛ تخفیف: ${formatPrice(res.discount)}`);
    } catch (err) {
      setCouponDiscount(0);
      setCouponError(err instanceof Error ? err.message : 'کد تخفیف نامعتبر است');
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validateAddress()) return;

    setSubmitting(true);
    try {
      // ساخت بدنه سفارش: آدرس ذخیره‌شده یا آدرس جدید
      const body: Record<string, unknown> = {
        items: items.map((i) => ({ partId: i.partId, quantity: i.quantity })),
        paymentMethod,
        note: note.trim() || undefined,
      };
      if (couponDiscount > 0 && couponCode.trim())
        body.couponCode = couponCode.trim().toUpperCase();
      if (selectedAddressId === 'new') body.address = address;
      else body.addressId = selectedAddressId;

      const order = await apiPost<Order>('/api/orders', body);
      setSuccessOrder(order);
      clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت سفارش');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------- نمایش موفقیت ----------------
  if (successOrder) {
    return (
      <div className={styles.page}>
        <div className={styles.successBox}>
          <span className={styles.successIcon} aria-hidden="true">✅</span>
          <h1>سفارش شما با موفقیت ثبت شد</h1>
          <p className="muted">
            شماره سفارش: <strong>{successOrder.id.toLocaleString('fa-IR')}</strong>
            {' — '}مبلغ کل:{' '}
            <strong>{formatPrice(successOrder.totalAmount)}</strong>
          </p>

          {successOrder.paymentMethod === 'card_transfer' && settings?.shopCardNumber && (
            <div className={styles.cardBox}>
              <h3>پرداخت کارت‌به‌کارت</h3>
              <p>
                لطفاً مبلغ سفارش را به کارت زیر واریز کنید و رسید را در تلگرام
                برای پشتیبانی ارسال نمایید. پس از تأیید پرداخت، سفارش شما ارسال می‌شود.
              </p>
              <div className={styles.cardNumber} dir="ltr">
                {settings.shopCardNumber}
              </div>
              {settings.shopCardHolder && (
                <div className={styles.cardHolder}>به نام: {settings.shopCardHolder}</div>
              )}
            </div>
          )}

          <div className={styles.successActions}>
            <Link href="/panel/orders" className="btn btn-primary">
              مشاهده سفارش‌های من
            </Link>
            <Link href="/products" className="btn btn-outline">
              ادامه خرید
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- حالت‌های بارگذاری/خالی ----------------
  if (authLoading || (user && dataLoading)) return <Loading />;

  if (!user) return null;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon="🛒"
          title="سبد خرید شما خالی است"
          description="برای ثبت سفارش، ابتدا محصولات را به سبد اضافه کنید."
          action={
            <Link href="/products" className="btn btn-primary">
              رفتن به فروشگاه
            </Link>
          }
        />
      </div>
    );
  }

  // ---------------- فرم تسویه ----------------
  return (
    <form className={styles.page} onSubmit={submitOrder} noValidate>
      <h1 className={styles.title}>🧾 تسویه حساب</h1>

      <div className={styles.layout}>
        <div className={styles.col}>
          {/* ---------- آدرس تحویل ---------- */}
          <section className={styles.section}>
            <h2>۱. آدرس تحویل سفارش</h2>

            {addresses.length > 0 && (
              <div className={styles.savedAddresses}>
                {addresses.map((a) => (
                  <label key={a.id} className={styles.addressOption}>
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                    />
                    <div className={styles.addressText}>
                      <strong>
                        {a.receiverName}
                        {a.isDefault && <span className={styles.defaultBadge}>پیش‌فرض</span>}
                      </strong>
                      <span>
                        {a.province}، {a.city}، {a.line}
                      </span>
                      <small dir="ltr">{a.receiverPhone}</small>
                    </div>
                  </label>
                ))}
                <label className={styles.addressOption}>
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === 'new'}
                    onChange={() => setSelectedAddressId('new')}
                  />
                  <div className={styles.addressText}>
                    <strong>➕ ارسال به آدرس جدید</strong>
                  </div>
                </label>
              </div>
            )}

            {selectedAddressId === 'new' && (
              <div className={styles.addressForm}>
                <div className={styles.formGrid}>
                  <div className="field">
                    <label className="label" htmlFor="receiverName">
                      نام و نام خانوادگی گیرنده <span className="req">*</span>
                    </label>
                    <input
                      id="receiverName"
                      className="input"
                      value={address.receiverName}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, receiverName: e.target.value }))
                      }
                    />
                    {fieldErrors.receiverName && (
                      <span className="fieldError">{fieldErrors.receiverName}</span>
                    )}
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="receiverPhone">
                      شماره موبایل <span className="req">*</span>
                    </label>
                    <input
                      id="receiverPhone"
                      className="input"
                      dir="ltr"
                      inputMode="numeric"
                      placeholder="09123456789"
                      value={address.receiverPhone}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, receiverPhone: e.target.value }))
                      }
                    />
                    {fieldErrors.receiverPhone && (
                      <span className="fieldError">{fieldErrors.receiverPhone}</span>
                    )}
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="province">
                      استان <span className="req">*</span>
                    </label>
                    <select
                      id="province"
                      className="select"
                      value={address.province}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, province: e.target.value, city: '' }))
                      }
                    >
                      <option value="">انتخاب استان...</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {fieldErrors.province && (
                      <span className="fieldError">{fieldErrors.province}</span>
                    )}
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="city">
                      شهر <span className="req">*</span>
                    </label>
                    <select
                      id="city"
                      className="select"
                      value={address.city}
                      onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                      disabled={!address.province}
                    >
                      <option value="">
                        {address.province ? 'انتخاب شهر...' : 'ابتدا استان را انتخاب کنید'}
                      </option>
                      {cities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {fieldErrors.city && (
                      <span className="fieldError">{fieldErrors.city}</span>
                    )}
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="postalCode">
                      کد پستی (۱۰ رقم) <span className="req">*</span>
                    </label>
                    <input
                      id="postalCode"
                      className="input"
                      dir="ltr"
                      inputMode="numeric"
                      placeholder="1234567890"
                      value={address.postalCode}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, postalCode: e.target.value.replace(/\D/g, '') }))
                      }
                    />
                    {fieldErrors.postalCode && (
                      <span className="fieldError">{fieldErrors.postalCode}</span>
                    )}
                  </div>

                  <div className="field full">
                    <label className="label" htmlFor="line">
                      آدرس محلی <span className="req">*</span>
                    </label>
                    <textarea
                      id="line"
                      className="textarea"
                      placeholder="خیابان، کوچه، پلاک، واحد..."
                      value={address.line}
                      onChange={(e) => setAddress((a) => ({ ...a, line: e.target.value }))}
                    />
                    {fieldErrors.line && (
                      <span className="fieldError">{fieldErrors.line}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ---------- روش پرداخت ---------- */}
          <section className={styles.section}>
            <h2>۲. روش پرداخت</h2>
            <div className={styles.payOptions}>
              <label className={styles.payOption}>
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === 'card_transfer'}
                  onChange={() => setPaymentMethod('card_transfer')}
                />
                <div>
                  <strong>💳 کارت‌به‌کارت</strong>
                  <span>واریز به حساب فروشگاه و ارسال رسید</span>
                </div>
              </label>
              <label className={styles.payOption}>
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div>
                  <strong>💵 پرداخت در محل</strong>
                  <span>پرداخت هنگام تحویل (فقط تهران و کرج)</span>
                </div>
              </label>
            </div>
          </section>

          {/* ---------- یادداشت ---------- */}
          <section className={styles.section}>
            <h2>۳. یادداشت سفارش (اختیاری)</h2>
            <textarea
              className="textarea"
              placeholder="مثلاً: رنگ محصول، زمان مناسب تحویل یا توضیح آدرس..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </section>
        </div>

        {/* ---------- خلاصه پرداخت ---------- */}
        <aside className={styles.summary}>
          <h2>خلاصه سفارش</h2>

          <div className={styles.miniItems}>
            {items.map((i) => (
              <div key={i.partId} className={styles.miniItem}>
                <span className={styles.miniQty}>{i.quantity.toLocaleString('fa-IR')}×</span>
                <span className={styles.miniName}>{i.name}</span>
              </div>
            ))}
          </div>

          <div className={styles.couponBox}>
            <input
              className={styles.couponInput}
              placeholder="کد تخفیف (مثلاً WELCOME10)"
              dir="ltr"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button
              type="button"
              className={styles.couponBtn}
              onClick={applyCoupon}
              disabled={checkingCoupon || !couponCode.trim()}
            >
              {checkingCoupon ? '...' : 'اعمال'}
            </button>
            {couponMsg && <p className="text-success" style={{ fontSize: '0.78rem' }}>{couponMsg}</p>}
            {couponError && <p className="text-danger" style={{ fontSize: '0.78rem' }}>{couponError}</p>}
          </div>

          <div className={styles.summaryRow}>
            <span>جمع کالاها</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>هزینه ارسال</span>
            <span>{shipping === 0 ? 'رایگان' : formatPrice(shipping)}</span>
          </div>
          {discount > 0 && (
            <div className={`${styles.summaryRow} ${styles.discountRow}`}>
              <span>تخفیف کد</span>
              <span>−{formatPrice(discount)}</span>
            </div>
          )}
          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span>مبلغ قابل پرداخت</span>
            <span>{formatPrice(total)}</span>
          </div>

          {error && <p className="formError" style={{ marginTop: 12 }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-success btn-large"
            style={{ width: '100%', marginTop: 12 }}
            disabled={submitting}
          >
            {submitting ? 'در حال ثبت سفارش...' : '✅ ثبت نهایی سفارش'}
          </button>
        </aside>
      </div>
    </form>
  );
}
