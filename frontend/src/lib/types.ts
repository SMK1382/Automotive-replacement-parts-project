// ===================================================================
// تایپ‌های مشترک فرانت‌اند — هم‌راستا با پاسخ‌های API بک‌اند
// ===================================================================

export type Role = 'user' | 'admin' | 'super_admin';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  iconEmoji: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
}

export interface CarModel {
  id: number;
  brandId: number;
  name: string;
  slug: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  partsCount?: number;
  models?: CarModel[];
}

export interface ProductImage {
  id: number;
  url: string;
  alt?: string | null;
  sortOrder: number;
}

export interface Compatibility {
  id: number;
  carModelId?: number;
  modelName: string;
  modelSlug: string;
  brandName?: string;
  brandSlug?: string;
  yearsNote?: string | null;
  engineCode?: string | null;
}

export interface PartListItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  partNumber: string | null;
  unit: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  brandId: number | null;
  brandName: string | null;
  brandSlug: string | null;
  imageUrl: string | null;
  avgRating: number;
  reviewCount: number;
}

export interface PartDetail extends PartListItem {
  description: string | null;
  weightGrams: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  images: ProductImage[];
  compatibility: Compatibility[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------- سفارش‌ها ----------------------

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type PaymentMethod = 'card_transfer' | 'cod';

export interface OrderItem {
  id: number;
  orderId: number;
  partId: number;
  quantity: number;
  unitPrice: number;
  partName?: string;
  partSlug?: string;
  imageUrl?: string | null;
}

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  postalCode: string;
  addressLine: string;
  note?: string | null;
  itemsSubtotal: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  couponCode?: string | null;
  trackingCode?: string | null;
  createdAt: string;
  updatedAt?: string;
  items?: OrderItem[];
  user?: { id: number; firstName: string; lastName: string; email: string };
}

// ---------------------- آدرس‌ها ----------------------

export interface Address {
  id: number;
  userId: number;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  postalCode: string;
  line: string;
  isDefault: boolean;
  createdAt: string;
}

// ---------------------- سایر موجودیت‌ها ----------------------

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  partId?: number;
  partName?: string;
  partSlug?: string;
  userId?: number;
  userName?: string;
  userLastName?: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  phone: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

// ---------------------- سبد خرید (سمت کلاینت) ----------------------

export interface CartItem {
  partId: number;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  imageUrl: string | null;
  stock: number;
  unit: string;
  quantity: number;
}
