// ===================================================================
// صفحه اصلی — کامپوننت سروری (SSR)
// -------------------------------------------------------------------
// همه داده‌ها سمت سرور و موازی گرفته می‌شوند تا محتوا از همان
// پاسخ اول در HTML باشد (سریع‌تر و مناسب SEO). چرخش خودکار بنر
// در کامپوننت کلاینت جدا (HeroSlider) انجام می‌شود.
// ===================================================================

import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { imageUrl } from '@/lib/format';
import type { Article, Banner, Category, PartListItem } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import HeroSlider from './HeroSlider';
import styles from './page.module.css';

// کش ۲ دقیقه‌ای — تعادل بین سرعت و تازگی داده
const revalidate = 120;

interface HomeData {
  banners: Banner[];
  tree: Category[];
  featured: PartListItem[];
  articles: Article[];
}

async function getHomeData(): Promise<HomeData> {
  const opts = { next: { revalidate } } as RequestInit;
  const empty: HomeData = { banners: [], tree: [], featured: [], articles: [] };
  try {
    const [bannersRes, treeRes, featuredRes, articlesRes] = await Promise.all([
      fetch(`${API_URL}/api/banners?placement=hero`, opts),
      fetch(`${API_URL}/api/categories/tree`, opts),
      fetch(`${API_URL}/api/parts/featured?limit=8`, opts),
      fetch(`${API_URL}/api/articles?limit=3`, opts),
    ]);
    const banners: Banner[] = bannersRes.ok ? await bannersRes.json() : [];
    const tree: Category[] = treeRes.ok ? await treeRes.json() : [];
    const featured: PartListItem[] = featuredRes.ok ? await featuredRes.json() : [];
    const articlesData: { items?: Article[] } = articlesRes.ok
      ? await articlesRes.json()
      : {};
    return {
      banners: banners.filter((b) => b.isActive),
      tree,
      featured,
      articles: articlesData.items ?? [],
    };
  } catch {
    return empty;
  }
}

export default async function HomePage() {
  const { banners, tree, featured, articles } = await getHomeData();
  const topCategories = tree.slice(0, 8);

  return (
    <div className={styles.home}>
      {/* ---------------- بنر اصلی (چرخش در کلاینت) ---------------- */}
      <HeroSlider banners={banners} />

      {/* ---------------- مزیت‌ها ---------------- */}
      <section className={styles.features}>
        <div className={styles.feature}>
          <span aria-hidden="true">✅</span>
          <div>
            <strong>ضمانت اصالت کالا</strong>
            <small>همه قطعات اورجینال و دارای فاکتور رسمی</small>
          </div>
        </div>
        <div className={styles.feature}>
          <span aria-hidden="true">🚚</span>
          <div>
            <strong>ارسال سریع</strong>
            <small>ارسال به سراسر کشور در کوتاه‌ترین زمان</small>
          </div>
        </div>
        <div className={styles.feature}>
          <span aria-hidden="true">↩️</span>
          <div>
            <strong>۷ روز ضمانت بازگشت</strong>
            <small>امکان مرجوع کردن کالا بدون دردسر</small>
          </div>
        </div>
        <div className={styles.feature}>
          <span aria-hidden="true">📞</span>
          <div>
            <strong>پشتیبانی کارشناسان</strong>
            <small>مشاوره تخصصی قبل از خرید</small>
          </div>
        </div>
      </section>

      {/* ---------------- دسته‌بندی‌ها ---------------- */}
      {topCategories.length > 0 && (
        <section>
          <div className="sectionTitle">
            <h2>🧰 خرید بر اساس دسته‌بندی</h2>
            <Link href="/products">همه دسته‌ها ←</Link>
          </div>
          <div className={styles.catGrid}>
            {topCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className={styles.catCard}
              >
                <span className={styles.catIcon} aria-hidden="true">
                  {cat.iconEmoji || '⚙️'}
                </span>
                <span className={styles.catName}>{cat.name}</span>
                {(cat.children?.length ?? 0) > 0 && (
                  <span className={styles.catCount}>
                    {(cat.children ?? []).map((c) => c.name).slice(0, 3).join(' • ')}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- محصولات ویژه ---------------- */}
      <section>
        <div className="sectionTitle">
          <h2>⭐ پیشنهاد ویژه یدک اکسپرت</h2>
          <Link href="/products?onDiscount=1">همه تخفیف‌ها ←</Link>
        </div>
        {featured.length === 0 ? (
          <p className={styles.noProducts}>فعلاً محصول ویژه‌ای موجود نیست.</p>
        ) : (
          <div className="productGrid">
            {featured.map((part) => (
              <ProductCard key={part.id} part={part} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- جدیدترین مقالات ---------------- */}
      {articles.length > 0 && (
        <section>
          <div className="sectionTitle">
            <h2>📝 از مجله فنی</h2>
            <Link href="/blog">همه مقالات ←</Link>
          </div>
          <div className={styles.blogGrid}>
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className={styles.blogCard}
              >
                {article.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(article.coverImage)}
                    alt={article.title}
                    className={styles.blogImg}
                    loading="lazy"
                  />
                )}
                <div className={styles.blogBody}>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
