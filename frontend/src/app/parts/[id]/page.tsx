// ===================================================================
// صفحه جزئیات قطعه (کامپوننت سرور)
// -------------------------------------------------------------------
// در Next.js 16 پارامتر params یک Promise است، پس آن را با await
// باز می‌کنیم و id را به یک کامپوننت کلاینت می‌دهیم که تعاملات
// (مثل دکمه سفارش) را مدیریت می‌کند.
// ===================================================================

import PartDetailClient from './PartDetailClient';

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PartDetailClient id={id} />;
}
