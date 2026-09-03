// ===================================================================
// قواعد خزنده‌ها — مسیرهای خصوصی از ایندکس خارج می‌شوند
// ===================================================================

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/panel', '/cart', '/checkout', '/login', '/register'],
    },
  };
}
