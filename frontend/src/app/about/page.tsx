import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: 'درباره ما',
  description:
    'یدک اکسپرت؛ فروشگاه تخصصی قطعات یدکی خودرو با ضمانت اصالت کالا و پشتیبانی کارشناسان فنی',
};

const stats = [
  { value: '+۱۵', label: 'سال تجربه در بازار قطعات' },
  { value: '+۵۰۰۰', label: 'مشتری راضی در سراسر ایران' },
  { value: '۲۴/۷', label: 'پشتیبانی آنلاین' },
  { value: '۹۸٪', label: 'رضایت از کیفیت قطعات' },
];

const values = [
  {
    icon: '✅',
    title: 'اصالت کالا',
    desc: 'همه قطعات از نمایندگی‌های رسمی تأمین و پیش از ارسال کارشناسی می‌شوند.',
  },
  {
    icon: '💬',
    title: 'مشاوره تخصصی',
    desc: 'کارشناسان ما قبل از خرید، قطعه سازگار با خودروی شما را پیدا می‌کنند.',
  },
  {
    icon: '🚚',
    title: 'ارسال سریع',
    desc: 'بسته‌بندی ایمن و ارسال بیمه‌شده به همه شهرهای ایران.',
  },
  {
    icon: '↩️',
    title: 'ضمانت بازگشت',
    desc: 'تا ۷ روز پس از دریافت، در صورت مغایرت کالا بدون قید و شرط مرجوع کنید.',
  },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'خانه', href: '/' }, { label: 'درباره ما' }]} />

      <header className={styles.hero}>
        <h1>درباره یدک اکسپرت</h1>
        <p>
          ما یک مجموعه تخصصی در زمینه تأمین و فروش قطعات یدکی خودروهای ایرانی
          و خارجی هستیم. هدف ما ساده کردن خرید قطعه اصل است: جست‌وجو بر اساس
          مدل خودرو، اطمینان از سازگاری و دریافت کالا با ضمانت.
        </p>
      </header>

      <section className={styles.statsRow}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      <section>
        <h2 className={styles.sectionTitle}>چرا یدک اکسپرت؟</h2>
        <div className={styles.valuesGrid}>
          {values.map((v) => (
            <div key={v.title} className={styles.valueCard}>
              <span aria-hidden="true">{v.icon}</span>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2>آماده اولین خرید هستید؟</h2>
        <p>همین حالا قطعه سازگار با خودروی خود را پیدا کنید.</p>
        <div className={styles.ctaActions}>
          <Link href="/products" className="btn btn-primary btn-large">
            مشاهده محصولات
          </Link>
          <Link href="/contact" className="btn btn-outline btn-large">
            تماس با ما
          </Link>
        </div>
      </section>
    </div>
  );
}
