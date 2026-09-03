import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { formatDate, imageUrl } from '@/lib/format';
import type { Article } from '@/lib/types';
import Breadcrumbs from '@/components/Breadcrumbs';
import styles from '../blog.module.css';

export const dynamic = 'force-dynamic';

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_URL}/api/articles/slug/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as Article;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'مقاله پیدا نشد' };
  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  // داده ساختاریافته مقاله برای موتورهای جست‌وجو
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.createdAt,
    dateModified: article.updatedAt ?? article.createdAt,
    ...(article.coverImage ? { image: imageUrl(article.coverImage) } : {}),
  };

  return (
    <article className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: 'خانه', href: '/' },
          { label: 'مجله', href: '/blog' },
          { label: article.title },
        ]}
      />

      <header className={styles.header}>
        <span className={styles.date}>{formatDate(article.createdAt)}</span>
        <h1>{article.title}</h1>
        <p className={styles.excerpt}>{article.excerpt}</p>
      </header>

      {article.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(article.coverImage)}
          alt={article.title}
          className={styles.heroImage}
        />
      )}

      <div className={styles.content}>
        {article.content.split('\n').filter(Boolean).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <div className={styles.backRow}>
        <Link href="/blog" className="btn btn-outline">
          → بازگشت به مجله
        </Link>
      </div>
    </article>
  );
}
