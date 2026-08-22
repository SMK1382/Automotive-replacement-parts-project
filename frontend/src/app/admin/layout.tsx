'use client';

// ===================================================================
// چیدمان پنل ادمین
// -------------------------------------------------------------------
// همه صفحات /admin/* در این چیدمان قرار می‌گیرند.
// AuthGuard با نقش 'admin' فقط به مدیران اجازه دسترسی می‌دهد.
// ===================================================================

import AuthGuard from '@/components/AuthGuard';
import PanelLayout from '@/components/PanelLayout';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard role="admin">
      <PanelLayout
        title="پنل ادمین"
        links={[
          { href: '/admin', label: 'داشبورد' },
          { href: '/admin/parts', label: 'مدیریت قطعات' },
          { href: '/admin/categories', label: 'دسته‌بندی‌ها' },
          { href: '/admin/orders', label: 'سفارش‌ها' },
          { href: '/admin/users', label: 'کاربران' },
        ]}
      >
        {children}
      </PanelLayout>
    </AuthGuard>
  );
}
