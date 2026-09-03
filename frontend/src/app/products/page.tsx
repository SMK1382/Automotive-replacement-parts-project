import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProductsClient from './ProductsClient';
import { Loading } from '@/components/States';

export const metadata: Metadata = {
  title: 'فروشگاه قطعات یدکی',
  description:
    'جست‌وجو و خرید قطعات یدکی خودرو بر اساس دسته‌بندی، برند، مدل خودرو، قیمت و موجودی.',
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductsClient />
    </Suspense>
  );
}
