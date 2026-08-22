import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

// بارگذاری فونت فارسی وزیرمتن از Google Fonts (به‌صورت خودکار بهینه‌سازی می‌شود)
// subset عربی شامل حروف فارسی است.
const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazirmatn',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'قطعات یدکی تویوتا',
  description: 'فروشگاه آنلاین قطعات یدکی خودروهای تویوتا',
};

// کامپوننت چیدمان ریشه: روی کل صفحه اعمال می‌شود
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lang="fa" و dir="rtl" برای زبان فارسی و چیدمان راست‌چین
    <html lang="fa" dir="rtl">
      <body className={vazirmatn.variable}>
        {/* AuthProvider وضعیت ورود کاربر را در کل برنامه در دسترس می‌گذارد */}
        <AuthProvider>
          <Navbar />
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
