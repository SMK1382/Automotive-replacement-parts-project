'use client';

// ===================================================================
// چیدمان مشترک پنل‌ها (کاربر و ادمین)
// -------------------------------------------------------------------
// یک نوار کناری (ساید‌بار) با عنوان و لینک‌ها، و یک بخش اصلی برای
// محتوای صفحه نمایش می‌دهد. هم پنل کاربر و هم پنل ادمین از آن استفاده
// می‌کنند تا کد تکراری ننویسیم.
// ===================================================================

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './PanelLayout.module.css';

export type PanelLink = {
  href: string;
  label: string;
};

export default function PanelLayout({
  title,
  links,
  children,
}: {
  title: string;
  links: PanelLink[];
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.layout}>
      {/* نوار کناری */}
      <aside className={styles.sidebar}>
        <h2 className={styles.title}>{title}</h2>
        <nav className={styles.nav}>
          {links.map((link) => {
            // اگر روی همین لینک هستیم، آن را پررنگ نشان بده
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={isActive ? styles.linkActive : styles.link}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* بخش اصلی محتوا */}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
