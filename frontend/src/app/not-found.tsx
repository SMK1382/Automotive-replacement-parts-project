import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', margin: '3rem auto', maxWidth: 560 }}>
      <div style={{ fontSize: '4rem' }} aria-hidden="true">🧭</div>
      <h1 style={{ fontSize: '1.4rem', margin: '0.5rem 0 0.75rem' }}>
        صفحه موردنظر پیدا نشد
      </h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        آدرس واردشده وجود ندارد یا صفحه جابه‌جا شده است.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-primary">بازگشت به خانه</Link>
        <Link href="/products" className="btn btn-outline">مشاهده محصولات</Link>
      </div>
    </div>
  );
}
