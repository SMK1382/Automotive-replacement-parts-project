'use client';

// ===================================================================
// چیدمان پنل مدیریت
// -------------------------------------------------------------------
// «ادمین فروشگاه» به همه امور روزمره دسترسی دارد: سفارش‌ها، قطعات،
// دسته‌بندی‌ها، برندها، کدهای تخفیف، نظرات، بنرها، مقالات و پیام‌ها.
// بخش‌های حساس (مدیریت کاربران) فقط برای «سوپر ادمین» نمایش داده
// می‌شود و API آن هم فقط با نقش super_admin باز است.
// ===================================================================

import { type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import PanelLayout from '@/components/PanelLayout';

// لینک‌های مشترک همه مدیران
const baseLinks = [
  { href: '/admin', label: '📊 داشبورد' },
  { href: '/admin/orders', label: '📦 سفارش‌ها' },
  { href: '/admin/parts', label: '⚙️ قطعات' },
  { href: '/admin/categories', label: '🗂 دسته‌بندی‌ها' },
  { href: '/admin/brands', label: '🚘 برندها و خودروها' },
  { href: '/admin/coupons', label: '🎟 کدهای تخفیف' },
  { href: '/admin/reviews', label: '⭐ نظرات' },
  { href: '/admin/banners', label: '🖼 بنرها' },
  { href: '/admin/articles', label: '📝 مقالات' },
  { href: '/admin/messages', label: '✉️ پیام‌ها' },
];

// لینک‌های انحصاری سوپر ادمین
const superAdminLinks = [
  { href: '/admin/users', label: '👥 کاربران (سوپر)' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isSuper = user?.role === 'super_admin';

  return (
    <AuthGuard role="admin">
      <PanelLayout
        title={isSuper ? 'پنل سوپر مدیر' : 'پنل مدیریت فروشگاه'}
        links={isSuper ? [...baseLinks, ...superAdminLinks] : baseLinks}
      >
        {children}
      </PanelLayout>
    </AuthGuard>
  );
}
