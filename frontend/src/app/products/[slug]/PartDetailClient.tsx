'use client';

// ===================================================================
// بخش تعاملی صفحه محصول: گالری تصاویر، انتخاب تعداد، افزودن به سبد،
// علاقه‌مندی، مشخصات، جدول سازگاری و نظرات
// ===================================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import {
  discountPercent,
  formatNumber,
  formatPrice,
  imageUrl,
} from '@/lib/format';
import type { PartDetail, Review } from '@/lib/types';
import { RatingInput, RatingStars } from '@/components/RatingStars';
import styles from './detail.module.css';

interface ReviewsResponse {
  items: Review[];
  avgRating: number;
  count: number;
}

export default function PartDetailClient({ part }: { part: PartDetail }) {
  const { addItem } = useCart();
  const { user } = useAuth();

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishState, setWishState] = useState<'idle' | 'in' | 'added'>('idle');

  const [tab, setTab] = useState<'desc' | 'specs' | 'compat' | 'reviews'>('desc');
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const off = discountPercent(part.price, part.discountPrice);
  const finalPrice = part.discountPrice ?? part.price;
  const inStock = part.stock > 0;

  // وضعیت علاقه‌مندی کاربر برای این محصول
  useEffect(() => {
    if (!user) return;
    apiGet<{ id: number }[]>('/api/wishlist')
      .then((rows) => {
        if (rows.some((w) => w.id === part.id)) setWishState('in');
      })
      .catch(() => {});
  }, [user, part.id]);

  // بارگذاری نظرات هنگام باز شدن تب نظرات
  useEffect(() => {
    if (tab !== 'reviews' || reviews) return;
    apiGet<ReviewsResponse>(`/api/reviews/part/${part.id}`)
      .then(setReviews)
      .catch(() => setReviews({ items: [], avgRating: 0, count: 0 }));
  }, [tab, reviews, part.id]);

  function handleAdd() {
    addItem(part, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  async function toggleWishlist() {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      if (wishState === 'in') {
        await apiDelete(`/api/wishlist/${part.id}`);
        setWishState('idle');
      } else {
        await apiPost(`/api/wishlist/${part.id}`);
        setWishState('in');
      }
    } catch {
      /* خطا نمایش داده نمی‌شود؛ دکمه وضعیت قبلی را نگه می‌دارد */
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewMsg('');
    setReviewError('');
    setSubmitting(true);
    try {
      await apiPost(`/api/reviews/part/${part.id}`, reviewForm);
      setReviewMsg('نظر شما ثبت شد و پس از بررسی کارشناسان نمایش داده می‌شود.');
      setReviewForm({ rating: 5, comment: '' });
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'خطا در ثبت نظر');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.detail}>
      {/* ---------------- گالری + اطلاعات ---------------- */}
      <div className={styles.top}>
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            {part.images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(part.images[activeImage]?.url)}
                alt={part.images[activeImage]?.alt || part.name}
              />
            ) : (
              <span className={styles.placeholder} aria-hidden="true">⚙️</span>
            )}
            {off > 0 && (
              <span className={styles.discountBadge}>٪{formatNumber(off)} تخفیف</span>
            )}
          </div>
          {part.images.length > 1 && (
            <div className={styles.thumbs}>
              {part.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ''}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`تصویر ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img.url)} alt={img.alt || part.name} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          {part.categoryName && (
            <Link
              href={`/products?category=${part.categorySlug}`}
              className={styles.categoryChip}
            >
              {part.categoryName}
            </Link>
          )}
          <h1 className={styles.name}>{part.name}</h1>

          <div className={styles.metaRow}>
            {part.reviewCount > 0 ? (
              <span className={styles.ratingBox}>
                <RatingStars value={part.avgRating} size="md" />
                <span className={styles.ratingText}>
                  {formatNumber(part.avgRating)} از ۵ ({formatNumber(part.reviewCount)} نظر)
                </span>
              </span>
            ) : (
              <span className={styles.ratingText}>هنوز نظری ثبت نشده است</span>
            )}
          </div>

          {part.partNumber && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>کد فنی:</span>
              <span className={styles.partNumber} dir="ltr">{part.partNumber}</span>
            </div>
          )}
          {part.brandName && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>برند:</span>
              <Link href={`/products?brand=${part.brandSlug}`} className={styles.brandLink}>
                {part.brandName}
              </Link>
            </div>
          )}

          <div className={styles.priceBox}>
            {off > 0 && (
              <del className={styles.oldPrice}>{formatPrice(part.price)}</del>
            )}
            <div className={styles.priceRow}>
              <span className={styles.price}>{formatPrice(finalPrice)}</span>
              {inStock ? (
                <span className={styles.stockOk}>
                  ✓ موجود در انبار ({formatNumber(part.stock)} {part.unit})
                </span>
              ) : (
                <span className={styles.stockOut}>✗ فعلاً ناموجود</span>
              )}
            </div>
          </div>

          {inStock && (
            <div className={styles.buyRow}>
              <div className={styles.quantityBox}>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(q + 1, part.stock))}
                  aria-label="افزایش تعداد"
                >
                  +
                </button>
                <span>{formatNumber(quantity)}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="کاهش تعداد"
                >
                  −
                </button>
              </div>

              <button
                type="button"
                className={`${styles.addBtn} ${added ? styles.added : ''}`}
                onClick={handleAdd}
              >
                {added ? '✓ به سبد اضافه شد' : '🛒 افزودن به سبد خرید'}
              </button>

              <button
                type="button"
                className={`${styles.wishBtn} ${wishState === 'in' ? styles.wishActive : ''}`}
                onClick={toggleWishlist}
                aria-label="افزودن به علاقه‌مندی‌ها"
                title="علاقه‌مندی‌ها"
              >
                {wishState === 'in' ? '❤️' : '🤍'}
              </button>
            </div>
          )}

          <ul className={styles.perks}>
            <li>✅ ضمانت اصالت و سلامت فیزیکی کالا</li>
            <li>🚚 ارسال از انبار تهران به سراسر کشور</li>
            <li>↩️ امکان بازگشت تا ۷ روز پس از دریافت</li>
          </ul>
        </div>
      </div>

      {/* ---------------- تب‌ها ---------------- */}
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'desc'}
          className={tab === 'desc' ? styles.tabActive : ''}
          onClick={() => setTab('desc')}
        >
          توضیحات
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'specs'}
          className={tab === 'specs' ? styles.tabActive : ''}
          onClick={() => setTab('specs')}
        >
          مشخصات فنی
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'compat'}
          className={tab === 'compat' ? styles.tabActive : ''}
          onClick={() => setTab('compat')}
        >
          خودروهای سازگار
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'reviews'}
          className={tab === 'reviews' ? styles.tabActive : ''}
          onClick={() => setTab('reviews')}
        >
          نظرات کاربران
        </button>
      </div>

      <div className={styles.tabContent}>
        {tab === 'desc' && (
          <div className={styles.desc}>
            {part.description ? (
              <p>{part.description}</p>
            ) : (
              <p className="muted">توضیحاتی برای این محصول ثبت نشده است.</p>
            )}
          </div>
        )}

        {tab === 'specs' && (
          <table className={styles.specTable}>
            <tbody>
              <tr>
                <th>نام محصول</th>
                <td>{part.name}</td>
              </tr>
              {part.partNumber && (
                <tr>
                  <th>کد فنی</th>
                  <td dir="ltr">{part.partNumber}</td>
                </tr>
              )}
              {part.brandName && (
                <tr>
                  <th>برند</th>
                  <td>{part.brandName}</td>
                </tr>
              )}
              <tr>
                <th>دسته‌بندی</th>
                <td>{part.categoryName ?? '—'}</td>
              </tr>
              <tr>
                <th>واحد فروش</th>
                <td>{part.unit}</td>
              </tr>
              {part.weightGrams ? (
                <tr>
                  <th>وزن</th>
                  <td>{formatNumber(part.weightGrams)} گرم</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}

        {tab === 'compat' &&
          (part.compatibility.length > 0 ? (
            <div className={styles.compatGrid}>
              {part.compatibility.map((c) => (
                <div key={c.id} className={styles.compatCard}>
                  <strong>🚗 {c.modelName}</strong>
                  <span className="muted">{c.brandName}</span>
                  {c.yearsNote && <small>سال‌های ساخت: {c.yearsNote}</small>}
                  {c.engineCode && (
                    <small>
                      موتور: <span dir="ltr">{c.engineCode}</span>
                    </small>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              اطلاعات سازگاری برای این محصول ثبت نشده است؛ برای اطمینان با
              پشتیبانی تماس بگیرید.
            </p>
          ))}

        {tab === 'reviews' && (
          <div className={styles.reviews}>
            {/* فرم ثبت نظر */}
            {user ? (
              <form className={styles.reviewForm} onSubmit={submitReview}>
                <h3>تجربه خود را بنویسید</h3>
                {reviewMsg && <p className="formSuccess">{reviewMsg}</p>}
                {reviewError && <p className="formError">{reviewError}</p>}
                <div className={styles.ratingPicker}>
                  <span className={styles.metaLabel}>امتیاز شما:</span>
                  <RatingInput
                    value={reviewForm.rating}
                    onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))}
                  />
                </div>
                <textarea
                  className="textarea"
                  placeholder="نظر خود درباره کیفیت، نصب و تجربه استفاده را بنویسید..."
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm((f) => ({ ...f, comment: e.target.value }))
                  }
                  required
                  minLength={5}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت نظر'}
                </button>
              </form>
            ) : (
              <p className={styles.loginHint}>
                برای ثبت نظر{' '}
                <Link href={`/login?next=/products/${part.slug}`}>وارد حساب خود شوید</Link>.
              </p>
            )}

            {/* فهرست نظرات */}
            {reviews === null ? (
              <p className="muted">در حال بارگذاری نظرات...</p>
            ) : reviews.items.length === 0 ? (
              <p className="muted">هنوز نظری برای این محصول تأیید نشده است.</p>
            ) : (
              <div className={styles.reviewList}>
                {reviews.items.map((r) => (
                  <article key={r.id} className={styles.reviewItem}>
                    <header>
                      <strong>
                        {r.userName} {r.userLastName}
                      </strong>
                      <RatingStars value={r.rating} />
                    </header>
                    <p>{r.comment}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
