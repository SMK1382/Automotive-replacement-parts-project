'use client';

// چیدمان پنل کاربر — نیازمند ورود
import { type ReactNode } from 'react';
import AuthGuard from '@/components/AuthGuard';
import PanelLayout from '@/components/PanelLayout';

const links = [
  { href: '/panel', label: '👤 پروفایل' },
  { href: '/panel/orders', label: '📦 سفارش‌های من' },
  { href: '/panel/addresses', label: '📍 آدرس‌های من' },
  { href: '/panel/wishlist', label: '❤️ علاقه‌مندی‌ها' },
];

export default function UserPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <PanelLayout title="حساب کاربری" links={links}>
        {children}
      </PanelLayout>
    </AuthGuard>
  );
}
