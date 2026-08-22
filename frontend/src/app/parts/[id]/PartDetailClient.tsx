'use client';

// ===================================================================
// کامپوننت کلاینت جزئیات قطعه
// -------------------------------------------------------------------
// اطلاعات یک قطعه را نشان می‌دهد و دکمه «سفارش این قطعه» را دارد.
// اگر کاربر وارد نشده باشد، او را به صفحه ورود هدایت می‌کند.
// ===================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Part } from '@/lib/types';
import styles from './page.module.css';

// قالب‌بندی قیمت فارسی
function formatPrice(price: number): string {
  return price.toLocaleString('fa-IR');
}

export default function PartDetailClient({ id }: { id: string }) {
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderMsg, setOrderMsg] = useState('');

  const { user } = useAuth();
  const router = useRouter();

  // گرفتن اطلاعات قطعه
  useEffect(() => {
    apiGet<Part>(`/api/parts/${id}`)
      .then((data) => setPart(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'قطعه پیدا نشد'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  // ثبت سفارش برای این قطعه
  async function handleOrder() {
    setError('');
    setOrderMsg('');

    // اگر وارد نشده، به صفحه ورود برو
    if (!user) {
      router.push('/login');
      return;
    }

    setOrdering(true);
    try {
      await apiPost('/api/orders', {
        items: [{ partId: Number(id), quantity: 1 }],
      });
      setOrderMsg('✅ سفارش شما با موفقیت ثبت شد. می‌توانید آن را در پنل کاربر ببینید.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت سفارش');
    } finally {
      setOrdering(false);
    }
  }

  if (loading) return <p className="muted">در حال بارگذاری...</p>;
  if (error && !part) return <p className="text-danger">{error}</p>;
  if (!part) return <p className="muted">قطعه پیدا نشد.</p>;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* تصویر */}
        <div className={styles.imageBox}>
          {part.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={part.imageUrl} alt={part.name} className={styles.image} />
          ) : (
            <div className={styles.placeholder}>⚙️</div>
          )}
        </div>

        {/* اطلاعات */}
        <div className={styles.info}>
          {part.categoryName && (
            <span className={styles.category}>{part.categoryName}</span>
          )}
          <h1 className={styles.name}>{part.name}</h1>
          {part.carModel && (
            <p className={styles.model}>🚗 مدل خودرو: {part.carModel}</p>
          )}
          {part.partNumber && (
            <p className="muted">کد فنی: {part.partNumber}</p>
          )}

          {part.description && (
            <p className={styles.description}>{part.description}</p>
          )}

          <div className={styles.priceBox}>
            <span className={styles.priceLabel}>قیمت:</span>
            <span className={styles.price}>
              {formatPrice(part.price)} تومان
            </span>
          </div>

          <p className={part.stock > 0 ? styles.stockOk : styles.stockOut}>
            {part.stock > 0
              ? `موجود در انبار (${part.stock} عدد)`
              : 'ناموجود'}
          </p>

          <button
            onClick={handleOrder}
            disabled={ordering || part.stock === 0}
            className="btn btn-primary"
          >
            {ordering ? 'در حال ثبت...' : 'سفارش این قطعه'}
          </button>

          {!user && (
            <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              برای سفارش باید ابتدا وارد شوید.
            </p>
          )}

          {orderMsg && (
            <p className={styles.success}>{orderMsg}</p>
          )}
          {error && <p className="text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
