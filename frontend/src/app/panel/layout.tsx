'use client';

// ===================================================================
// چیدمان پنل کاربر
// -------------------------------------------------------------------
// همه صفحات /panel/* در این چیدمان قرار می‌گیرند.
// AuthGuard مطمئن می‌شود که کاربر وارد شده باشد.
// ===================================================================

import AuthGuard from '@/components/AuthGuard';
import PanelLayout from '@/components/PanelLayout';

export default function PanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <PanelLayout
        title="پنل کاربر"
        links={[
          { href: '/panel', label: 'پروفایل' },
          { href: '/panel/orders', label: 'سفارش‌های من' },
        ]}
      >
        {children}
      </PanelLayout>
    </AuthGuard>
  );
}
