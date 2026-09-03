// ===================================================================
// نقشه سایت پویا — شامل صفحات ثابت، محصولات و مقالات
// ===================================================================

import type { MetadataRoute } from 'next';
import { API_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: '/', priority: 1 },
    { url: '/products', priority: 0.9 },
    { url: '/blog', priority: 0.6 },
    { url: '/about', priority: 0.4 },
    { url: '/contact', priority: 0.4 },
    { url: '/track', priority: 0.4 },
  ].map((p) => ({
    url: p.url,
    lastModified: new Date(),
    priority: p.priority,
  }));

  // محصولات — صفحه‌به‌صفحه (سقف هر درخواست ۶۰ است)
  try {
    for (let page = 1; page <= 4; page++) {
      const res = await fetch(
        `${API_URL}/api/parts?limit=60&page=${page}&sort=newest`,
        { cache: 'no-store' },
      );
      if (!res.ok) {
        console.error(`[sitemap] parts page ${page} -> HTTP ${res.status}`);
        break;
      }
      const data = (await res.json()) as {
        items: { slug: string; createdAt: string }[];
        totalPages: number;
      };
      for (const item of data.items) {
        entries.push({
          url: `/products/${item.slug}`,
          lastModified: new Date(item.createdAt),
          priority: 0.8,
        });
      }
      if (page >= data.totalPages) break;
    }
  } catch (err) {
    console.error('[sitemap] parts fetch failed:', err);
  }

  // مقالات منتشرشده
  try {
    const res = await fetch(`${API_URL}/api/articles?limit=60`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as {
        items: { slug: string; updatedAt?: string; createdAt: string }[];
      };
      for (const item of data.items) {
        entries.push({
          url: `/blog/${item.slug}`,
          lastModified: new Date(item.updatedAt ?? item.createdAt),
          priority: 0.6,
        });
      }
    }
  } catch {
    // بی‌صدا رد شود
  }

  return entries;
}
