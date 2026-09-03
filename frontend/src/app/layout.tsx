import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { API_URL } from '@/lib/api';
import type { Brand, Category } from '@/lib/types';

export const metadata: Metadata = {
  metadataBase: new URL('https://yadakexpert.com'),
  title: {
    default: 'یدک اکسپرت | فروشگاه آنلاین قطعات یدکی خودرو',
    template: '%s | یدک اکسپرت',
  },
  description:
    'خرید آنلاین قطعات یدکی اورجینال خودروهای ایرانی و خارجی با ضمانت اصالت کالا، جست‌وجوی سریع بر اساس مدل خودرو و ارسال به سراسر ایران.',
  keywords: [
    'قطعات یدکی',
    'لوازم یدکی خودرو',
    'قطعات اورجینال',
    'یدک اکسپرت',
    'yadakexpert',
  ],
  openGraph: {
    siteName: 'یدک اکسپرت',
    locale: 'fa_IR',
    type: 'website',
  },
};

// -------------------------------------------------------------------
// داده‌های منو (دسته‌بندی/برند) سمت سرور گرفته و کش می‌شوند تا
// هدر در هر بارگذاری صفحه درخواست اضافه به API نزند.
// revalidate: ۵ دقیقه — تغییرات پنل ادمین حداکثر پس از ۵ دقیقه
// برای بازدیدکننده‌های جدید نمایان می‌شود.
// -------------------------------------------------------------------
async function getMenuData(): Promise<{ tree: Category[]; brands: Brand[] }> {
  const opts = { next: { revalidate: 300 } } as RequestInit;
  try {
    const [treeRes, brandsRes] = await Promise.all([
      fetch(`${API_URL}/api/categories/tree`, opts),
      fetch(`${API_URL}/api/brands?withModels=1`, opts),
    ]);
    const tree = treeRes.ok ? await treeRes.json() : [];
    const brands = brandsRes.ok ? await brandsRes.json() : [];
    return { tree, brands };
  } catch {
    // نبود سرور نباید رندر صفحه را متوقف کند
    return { tree: [], brands: [] };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { tree, brands } = await getMenuData();

  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* فونت وزیرمتن از CDN گوگل در مرورگر بارگذاری می‌شود؛
            در نبود اینترنت به فونت جایگزین سیستم برمی‌گردد */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <Header tree={tree} brands={brands} />
            <main className="container">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
