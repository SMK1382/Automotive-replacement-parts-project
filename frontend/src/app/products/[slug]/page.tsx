// ===================================================================
// صفحه جزئیات محصول (کامپوننت سروری برای SEO)
// -------------------------------------------------------------------
// - متادیتای صفحه از فیلدهای اختصاصی محصول ساخته می‌شود
// - داده ساختاریافته Product برای موتورهای جست‌وجو تزریق می‌شود
// - تعاملات (گالری، سبد، نظر) در کامپوننت‌های کلاینت انجام می‌شود
// ===================================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { API_URL } from '@/lib/api';
import type { PartDetail, PartListItem } from '@/lib/types';
import Breadcrumbs from '@/components/Breadcrumbs';
import ProductCard from '@/components/ProductCard';
import PartDetailClient from './PartDetailClient';
import styles from './detail.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPart(slug: string): Promise<PartDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/parts/slug/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PartDetail;
  } catch {
    return null;
  }
}

async function getRelated(id: number): Promise<PartListItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/parts/${id}/related`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return (await res.json()) as PartListItem[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const part = await getPart(slug);
  if (!part) return { title: 'محصول پیدا نشد' };

  const title = part.metaTitle || part.name;
  const description =
    part.metaDescription ||
    part.description?.slice(0, 155) ||
    `خرید ${part.name} با ضمانت اصالت کالا از یدک اکسپرت`;

  return {
    title,
    description,
    alternates: { canonical: `/products/${part.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      ...(part.imageUrl
        ? { images: [{ url: `${API_URL}${part.imageUrl}` }] }
        : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const part = await getPart(slug);
  if (!part) notFound();

  const related = await getRelated(part.id);

  // داده ساختاریافته محصول برای موتورهای جست‌وجو
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: part.name,
    sku: part.partNumber ?? undefined,
    description: part.description ?? part.name,
    image: part.images.length
      ? part.images.map((img) => `${API_URL}${img.url}`)
      : undefined,
    brand: part.brandName ? { '@type': 'Brand', name: part.brandName } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRT',
      price: part.discountPrice ?? part.price,
      availability:
        part.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
    ...(part.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: part.avgRating,
            reviewCount: part.reviewCount,
          },
        }
      : {}),
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: 'خانه', href: '/' },
          { label: 'محصولات', href: '/products' },
          ...(part.categorySlug
            ? [{ label: part.categoryName ?? '', href: `/products?category=${part.categorySlug}` }]
            : []),
          { label: part.name },
        ]}
      />

      <PartDetailClient part={part} />

      {related.length > 0 && (
        <section>
          <div className="sectionTitle">
            <h2>🔁 قطعات مرتبط</h2>
          </div>
          <div className="productGrid">
            {related.map((p) => (
              <ProductCard key={p.id} part={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
