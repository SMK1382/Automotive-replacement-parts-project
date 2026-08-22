// ===================================================================
// نوع‌های مشترک TypeScript
// -------------------------------------------------------------------
// این نوع‌ها شکل داده‌هایی را که از بک‌енд می‌گیریم، تعریف می‌کنند.
// ===================================================================

export type Role = 'user' | 'admin';

// کاربر
export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

// دسته‌بندی
export type Category = {
  id: number;
  name: string;
  createdAt: string;
};

// قطعه (همراه با نام دسته که از JOIN می‌آید)
export type Part = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  partNumber: string | null;
  carModel: string | null;
  imageUrl: string | null;
  categoryId: number | null;
  categoryName: string | null;
  createdAt: string;
};

// یک آیتم داخل سفارش
export type OrderItem = {
  id: number;
  orderId: number;
  partId: number;
  quantity: number;
  price: number;
};

// سفارش
export type Order = {
  id: number;
  userId: number;
  status: string;
  totalAmount: number;
  address: string | null;
  createdAt: string;
  items?: OrderItem[];
  user?: Pick<User, 'id' | 'name' | 'email'>;
};
