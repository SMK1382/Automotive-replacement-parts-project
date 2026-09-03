// ===================================================================
// فوتر سایت: اطلاعات تماس، لینک‌های سریع، نمادها و کپی‌رایت
// ===================================================================

import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.about}>
          <div className={styles.logo}>
            <span aria-hidden="true">🚗</span> یدک<span>پارت</span>
          </div>
          <p className={styles.desc}>
            فروشگاه تخصصی قطعات یدکی خودروهای ایرانی و خارجی؛ ضمانت اصالت
            کالا، ارسال سریع به سراسر کشور و پشتیبانی کارشناسان فنی.
          </p>
          <div className={styles.contactRows}>
            <span>📞 پشتیبانی: <span dir="ltr">۰۲۱-۱۲۳۴۵۶۷۸</span></span>
            <span>🕘 شنبه تا پنجشنبه، ۹ تا ۱۸</span>
          </div>
        </div>

        <nav className={styles.col} aria-label="دسترسی سریع">
          <h3>دسترسی سریع</h3>
          <Link href="/products">همه محصولات</Link>
          <Link href="/track">پیگیری سفارش</Link>
          <Link href="/blog">مجله فنی</Link>
          <Link href="/about">درباره ما</Link>
          <Link href="/contact">تماس با ما</Link>
        </nav>

        <nav className={styles.col} aria-label="خدمات مشتریان">
          <h3>خدمات مشتریان</h3>
          <Link href="/panel/orders">سفارش‌های من</Link>
          <Link href="/panel/wishlist">علاقه‌مندی‌ها</Link>
          <Link href="/register">ثبت‌نام</Link>
          <Link href="/login">ورود به حساب</Link>
        </nav>

        <div className={styles.col}>
          <h3>خرید مطمئن</h3>
          <div className={styles.trustRow}>
            <span className={styles.trustBadge}>✅ ضمانت اصالت کالا</span>
            <span className={styles.trustBadge}>🚚 ارسال به سراسر ایران</span>
            <span className={styles.trustBadge}>↩️ ۷ روز ضمانت بازگشت</span>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={`container ${styles.bottomInner}`}>
          <span>© {year.toLocaleString('fa-IR', { useGrouping: false })} یدک اکسپرت — تمامی حقوق محفوظ است.</span>
          <span className={styles.payment}>💳 پرداخت امن | 📦 ارسال بیمه‌شده</span>
        </div>
      </div>
    </footer>
  );
}
