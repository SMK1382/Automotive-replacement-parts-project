import type { Metadata } from 'next';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { formatDate, imageUrl } from '@/lib/format';
import type { Article } from '@/lib/types';
import { EmptyState } from '@/components/States';
import styles from './blog.module.css';

export const metadata: Metadata = {
  title: 'مجله فنی',
  description: 'مقالات آموزشی درباره نگهداری خودرو، تشخیص قطعات اصل و راهنمای خرید',
};

export const dynamic = 'force-dynamic';

async function getArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${API_URL}/api/articles?limit=24`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: Article[] };
    return data.items;
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const articles = await getArticles();

  if (articles.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>مجله فنی یدک اکسپرت</h1>
        <EmptyState
          icon="📝"
          title="فعلاً مقاله‌ای منتشر نشده است"
          description="به‌زودی مقالات آموزشی نگهداری خودرو اینجا قرار می‌گیرد."
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>مجله فنی یدک اکسپرت</h1>
      <p className={styles.subtitle}>
        راهنمای خرید قطعات، نگهداری خودرو و نکات کارشناسی
      </p>

      <div className={styles.grid}>
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/blog/${article.slug}`}
            className={styles.card}
          >
            {article.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(article.coverImage)}
                alt={article.title}
                className={styles.cover}
              />
            )}
            <div className={styles.body}>
              <span className={styles.date}>{formatDate(article.createdAt)}</span>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
              <span className={styles.more}>ادامه مطلب ←</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
