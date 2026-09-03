// ===================================================================
// تعریف جداول دیتابیس (Drizzle Schema)
// -------------------------------------------------------------------
// این فایل شکل تمام جداول سایت را تعریف می‌کند.
// بعد از تغییر این فایل، دستور `npm run db:push` را بزنید تا تغییرات
// روی دیتابیس اعمال شود.
// ===================================================================

import { relations } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  boolean,
  text,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ------------------------------------------------------------------
//enum ها (مقادیر ثابت وضعیت‌ها)
// ------------------------------------------------------------------

// نقش کاربر: 'user' = کاربر معمولی، 'admin' = مدیر سایت
export const roleEnum = pgEnum('user_role', [
  'user',
  'admin', // مدیر فروشگاه — مدیریت کامل امور روزمره
  'super_admin', // سوپر مدیر — دسترسی کامل به همه امکانات از جمله کاربران
]);

// وضعیت سفارش در چرخه کامل پردازش
export const orderStatusEnum = pgEnum('order_status', [
  'pending', // ثبت‌شده، در انتظار تأیید
  'confirmed', // تأییدشده، در حال آماده‌سازی
  'processing', // در حال پردازش / بسته‌بندی
  'shipped', // ارسال‌شده
  'delivered', // تحویل‌شده
  'cancelled', // لغو‌شده
]);

// روش پرداخت (بدون درگاه آنلاین — قابل توسعه در آینده)
export const paymentMethodEnum = pgEnum('payment_method', [
  'cod', // پرداخت در محل
  'card_transfer', // کارت‌به‌کارت
]);

// وضعیت پرداخت
export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid', // پرداخت‌نشده
  'paid', // پرداخت‌شده
  'refunded', // بازگشت وجه
]);

// نوع کد تخفیف: درصدی یا مبلغ ثابت
export const couponTypeEnum = pgEnum('coupon_type', ['percent', 'fixed']);

// وضعیت نظر کاربر (قبل از نمایش باید تأیید شود)
export const reviewStatusEnum = pgEnum('review_status', [
  'pending', // در انتظار بررسی
  'approved', // تأییدشده و قابل نمایش
  'rejected', // رد‌شده
]);

// محل نمایش بنر
export const bannerPlacementEnum = pgEnum('banner_placement', [
  'hero', // اسلایدر بالای صفحه اصلی
  'strip', // نوار بنر میانی
]);

// ------------------------------------------------------------------
// جدول کاربران
// ------------------------------------------------------------------
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    firstName: varchar('first_name', { length: 60 }).notNull(), // نام
    lastName: varchar('last_name', { length: 60 }).notNull(), // نام خانوادگی
    email: varchar('email', { length: 150 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(), // به‌صورت هش‌شده ذخیره می‌شود
    phone: varchar('phone', { length: 11 }).notNull(), // موبایل (09xxxxxxxxx)
    role: roleEnum('role').default('user').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_phone_unique').on(table.phone),
  ],
);

// ------------------------------------------------------------------
// دفتر آدرس کاربران (هر کاربر می‌تواند چند آدرس داشته باشد)
// ------------------------------------------------------------------
export const addresses = pgTable(
  'addresses',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    receiverName: varchar('receiver_name', { length: 120 }).notNull(), // نام گیرنده
    receiverPhone: varchar('receiver_phone', { length: 11 }).notNull(), // موبایل گیرنده
    province: varchar('province', { length: 50 }).notNull(), // استان (یکی از ۳۱ استان ایران)
    city: varchar('city', { length: 60 }).notNull(), // شهر (وابسته به استان)
    postalCode: varchar('postal_code', { length: 10 }).notNull(), // کد پستی دقیقاً ۱۰ رقم
    line: text('line').notNull(), // آدرس محلی کامل
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('addresses_user_idx').on(table.userId)],
);

// ------------------------------------------------------------------
// برند خودرو (تویوتا، لکسوس، هیوندای، کیا و...)
// ------------------------------------------------------------------
export const brands = pgTable(
  'brands',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(), // برای URL فارسی‌خوانا
    logoUrl: varchar('logo_url', { length: 500 }),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('brands_slug_unique').on(table.slug)],
);

// ------------------------------------------------------------------
// مدل خودرو (کرولا، کمری، سوناتا و...) — وابسته به برند
// ------------------------------------------------------------------
export const carModels = pgTable(
  'car_models',
  {
    id: serial('id').primaryKey(),
    brandId: integer('brand_id')
      .references(() => brands.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('car_models_brand_slug_unique').on(table.brandId, table.slug),
    index('car_models_brand_idx').on(table.brandId),
  ],
);

// ------------------------------------------------------------------
// دسته‌بندی قطعات (با قابلیت زیردسته از طریق parentId)
// ------------------------------------------------------------------
export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    parentId: integer('parent_id'), // خودارجاع؛ در migrate/relations مدیریت می‌شود
    iconEmoji: varchar('icon_emoji', { length: 10 }), // مثل 🔧 برای نمایش در کارت
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('categories_slug_unique').on(table.slug),
    index('categories_parent_idx').on(table.parentId),
  ],
);

// ------------------------------------------------------------------
// جدول قطعات (محصولات)
// ------------------------------------------------------------------
export const parts = pgTable(
  'parts',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 180 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull(),
    description: text('description'),
    price: integer('price').notNull(), // قیمت به تومان
    discountPrice: integer('discount_price'), // قیمت با تخفیف (اگر باشد)
    stock: integer('stock').default(0).notNull(), // تعداد موجود در انبار
    partNumber: varchar('part_number', { length: 60 }), // کد فنی قطعه
    weightGrams: integer('weight_grams'), // وزن به گرم
    unit: varchar('unit', { length: 30 }).default('عدد').notNull(), // واحد فروش
    categoryId: integer('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    brandId: integer('brand_id').references(() => brands.id, {
      onDelete: 'set null',
    }), // برند اصلی قطعه (سازنده)
    isActive: boolean('is_active').default(true).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(), // نمایش در ویژه‌ها
    metaTitle: varchar('meta_title', { length: 200 }), // عنوان سئو
    metaDescription: varchar('meta_description', { length: 400 }), // توضیحات سئو
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('parts_slug_unique').on(table.slug),
    index('parts_category_idx').on(table.categoryId),
    index('parts_brand_idx').on(table.brandId),
    index('parts_active_featured_idx').on(table.isActive, table.isFeatured),
    index('parts_part_number_idx').on(table.partNumber),
  ],
);

// ------------------------------------------------------------------
// تصاویر هر قطعه (گالری)
// ------------------------------------------------------------------
export const productImages = pgTable(
  'product_images',
  {
    id: serial('id').primaryKey(),
    partId: integer('part_id')
      .references(() => parts.id, { onDelete: 'cascade' })
      .notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    alt: varchar('alt', { length: 200 }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [index('product_images_part_idx').on(table.partId)],
);

// ------------------------------------------------------------------
// سازگاری قطعه با مدل خودرو (رابطه چند‌به‌چند + بازه سال)
// ------------------------------------------------------------------
export const partCompatibility = pgTable(
  'part_compatibility',
  {
    id: serial('id').primaryKey(),
    partId: integer('part_id')
      .references(() => parts.id, { onDelete: 'cascade' })
      .notNull(),
    carModelId: integer('car_model_id')
      .references(() => carModels.id, { onDelete: 'cascade' })
      .notNull(),
    yearsNote: varchar('years_note', { length: 40 }).default('').notNull(), // مثل «2018-2022»
    engineCode: varchar('engine_code', { length: 60 }), // کد موتور اگر مشخص باشد
  },
  (table) => [
    uniqueIndex('part_compat_unique').on(
      table.partId,
      table.carModelId,
      table.yearsNote,
    ),
    index('part_compat_model_idx').on(table.carModelId),
  ],
);

// ------------------------------------------------------------------
// جدول سفارش‌ها
// اطلاعات ارسال به‌صورت «اسنپ‌شات» در خود سفارش ذخیره می‌شود تا
// تغییر آدرس کاربر بعداً سفارش‌های قبلی را خراب نکند.
// ------------------------------------------------------------------
export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    status: orderStatusEnum('status').default('pending').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentStatus: paymentStatusEnum('payment_status')
      .default('unpaid')
      .notNull(),
    // اسنپ‌شات اطلاعات ارسال
    receiverName: varchar('receiver_name', { length: 120 }).notNull(),
    receiverPhone: varchar('receiver_phone', { length: 11 }).notNull(),
    province: varchar('province', { length: 50 }).notNull(),
    city: varchar('city', { length: 60 }).notNull(),
    postalCode: varchar('postal_code', { length: 10 }).notNull(),
    addressLine: text('address_line').notNull(),
    note: text('note'), // توضیحات سفارش (اختیاری)
    // مبالغ (همه به تومان)
    itemsSubtotal: integer('items_subtotal').default(0).notNull(),
    discountAmount: integer('discount_amount').default(0).notNull(),
    shippingCost: integer('shipping_cost').default(0).notNull(),
    totalAmount: integer('total_amount').default(0).notNull(),
    couponCode: varchar('coupon_code', { length: 40 }),
    trackingCode: varchar('tracking_code', { length: 60 }), // کد رهگیری پست
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('orders_user_idx').on(table.userId),
    index('orders_status_created_idx').on(table.status, table.createdAt),
  ],
);

// ------------------------------------------------------------------
// جدول آیتم‌های هر سفارش (با اسنپ‌شات نام/قیمت قطعه)
// ------------------------------------------------------------------
export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    partId: integer('part_id')
      .references(() => parts.id)
      .notNull(),
    partName: varchar('part_name', { length: 180 }).notNull(), // اسنپ‌شات
    partNumber: varchar('part_number', { length: 60 }), // اسنپ‌شات
    imageUrl: varchar('image_url', { length: 500 }), // اسنپ‌شات
    quantity: integer('quantity').default(1).notNull(),
    unitPrice: integer('unit_price').notNull(), // قیمت واحد در لحظه ثبت سفارش
  },
  (table) => [index('order_items_order_idx').on(table.orderId)],
);

// ------------------------------------------------------------------
// کدهای تخفیف
// ------------------------------------------------------------------
export const coupons = pgTable(
  'coupons',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 40 }).notNull(), // کد قابل واردکردن توسط کاربر
    type: couponTypeEnum('type').notNull(), // percent | fixed
    value: integer('value').notNull(), // درصد (۱ تا ۱۰۰) یا مبلغ تومان
    minSubtotal: integer('min_subtotal').default(0).notNull(), // حداقل مبلغ سبد
    maxUses: integer('max_uses'), // حداکثر تعداد استفاده (نامحدود = null)
    usedCount: integer('used_count').default(0).notNull(),
    expiresAt: timestamp('expires_at'), // تاریخ انقضا (نامحدود = null)
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('coupons_code_unique').on(table.code)],
);

// ------------------------------------------------------------------
// نظرات و امتیاز کاربران روی قطعات (نمایش بعد از تأیید ادمین)
// ------------------------------------------------------------------
export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    partId: integer('part_id')
      .references(() => parts.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    rating: integer('rating').notNull(), // ۱ تا ۵
    comment: text('comment').notNull(),
    status: reviewStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('reviews_part_user_unique').on(table.partId, table.userId),
    index('reviews_part_status_idx').on(table.partId, table.status),
  ],
);

// ------------------------------------------------------------------
// علاقه‌مندی‌های کاربر
// ------------------------------------------------------------------
export const wishlist = pgTable(
  'wishlist',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    partId: integer('part_id')
      .references(() => parts.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('wishlist_user_part_unique').on(table.userId, table.partId)],
);

// ------------------------------------------------------------------
// بنرهای تبلیغاتی صفحه اصلی
// ------------------------------------------------------------------
export const banners = pgTable(
  'banners',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 150 }).notNull(),
    subtitle: varchar('subtitle', { length: 250 }),
    imageUrl: varchar('image_url', { length: 500 }).notNull(),
    linkUrl: varchar('link_url', { length: 500 }).notNull(),
    placement: bannerPlacementEnum('placement').default('hero').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('banners_placement_idx').on(table.placement, table.isActive)],
);

// ------------------------------------------------------------------
// مقالات بلاگ
// ------------------------------------------------------------------
export const articles = pgTable(
  'articles',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull(),
    excerpt: varchar('excerpt', { length: 500 }), // خلاصه برای لیست
    content: text('content').notNull(),
    coverImageUrl: varchar('cover_image_url', { length: 500 }),
    isPublished: boolean('is_published').default(false).notNull(),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('articles_slug_unique').on(table.slug)],
);

// ------------------------------------------------------------------
// پیام‌های صفحه تماس با ما
// ------------------------------------------------------------------
export const contactMessages = pgTable(
  'contact_messages',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 11 }),
    subject: varchar('subject', { length: 200 }).notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('contact_messages_read_idx').on(table.isRead, table.createdAt)],
);

// ===================================================================
// روابط بین جداول (برای استفاده در db.query و join خودکار)
// ===================================================================

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  addresses: many(addresses),
  reviews: many(reviews),
  wishlist: many(wishlist),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  models: many(carModels),
  parts: many(parts),
}));

export const carModelsRelations = relations(carModels, ({ one, many }) => ({
  brand: one(brands, { fields: [carModels.brandId], references: [brands.id] }),
  compatibility: many(partCompatibility),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_parent',
  }),
  children: many(categories, { relationName: 'category_parent' }),
  parts: many(parts),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  category: one(categories, {
    fields: [parts.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, { fields: [parts.brandId], references: [brands.id] }),
  images: many(productImages),
  compatibility: many(partCompatibility),
  reviews: many(reviews),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  part: one(parts, { fields: [productImages.partId], references: [parts.id] }),
}));

export const partCompatibilityRelations = relations(
  partCompatibility,
  ({ one }) => ({
    part: one(parts, {
      fields: [partCompatibility.partId],
      references: [parts.id],
    }),
    carModel: one(carModels, {
      fields: [partCompatibility.carModelId],
      references: [carModels.id],
    }),
  }),
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  part: one(parts, { fields: [orderItems.partId], references: [parts.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  part: one(parts, { fields: [reviews.partId], references: [parts.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(users, { fields: [wishlist.userId], references: [users.id] }),
  part: one(parts, { fields: [wishlist.partId], references: [parts.id] }),
}));

// ===================================================================
// تعریف نوع‌های TypeScript (توسط Drizzle خودکار ساخته می‌شوند)
// ===================================================================
export type User = typeof users.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type CarModel = typeof carModels.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type PartCompatibility = typeof partCompatibility.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type WishlistItem = typeof wishlist.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
