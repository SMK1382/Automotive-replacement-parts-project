// ===================================================================
// تعریف جداول دیتابیس (Drizzle Schema)
// -------------------------------------------------------------------
// این فایل شکل تمام جداول سایت را تعریف می‌کند.
// بعد از تغییر این فایل، دستور `npm run db:push` را بزنید تا تغییرات
// روی دیتابیس اعمال شود.
// ===================================================================
import { relations } from 'drizzle-orm';
import { pgTable, pgEnum, serial, integer, text, varchar, timestamp, } from 'drizzle-orm/pg-core';
// نقش کاربر: 'user' = کاربر معمولی، 'admin' = مدیر سایت
export const roleEnum = pgEnum('user_role', ['user', 'admin']);
// ------------------------------------------------------------------
// جدول کاربران
// ------------------------------------------------------------------
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 150 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(), // به‌صورت هش‌شده ذخیره می‌شود
    phone: varchar('phone', { length: 20 }),
    role: roleEnum('role').default('user').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// ------------------------------------------------------------------
// جدول دسته‌بندی قطعات (مثلاً: موتور، ترمز، تعلیق، برق)
// ------------------------------------------------------------------
export const categories = pgTable('categories', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// ------------------------------------------------------------------
// جدول قطعات
// ------------------------------------------------------------------
export const parts = pgTable('parts', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    price: integer('price').notNull(), // قیمت به تومان
    stock: integer('stock').default(0).notNull(), // تعداد موجود در انبار
    partNumber: varchar('part_number', { length: 50 }), // کد فنی قطعه
    carModel: varchar('car_model', { length: 100 }), // مدل خودروی تویوتا (مثلاً کرولا 2018)
    imageUrl: varchar('image_url', { length: 500 }),
    categoryId: integer('category_id').references(() => categories.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// ------------------------------------------------------------------
// جدول سفارش‌ها
// توجه: فیلد status را به‌صورت متن ساده (varchar) گذاشتیم، نه ENUM،
// تا بعداً تغییر مقادیر آن آسان باشد و درگیر محدودیت‌های PostgreSQL نشود.
// ------------------------------------------------------------------
export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending / confirmed / delivered / cancelled
    totalAmount: integer('total_amount').default(0).notNull(), // مبلغ کل به تومان
    address: text('address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// ------------------------------------------------------------------
// جدول آیتم‌های هر سفارش (هر سفارش می‌تواند چند قطعه داشته باشد)
// ------------------------------------------------------------------
export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orders.id).notNull(),
    partId: integer('part_id').references(() => parts.id).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    price: integer('price').notNull(), // قیمت قطعه در لحظه ثبت سفارش
});
// ===================================================================
// روابط بین جداول (برای استفاده در db.query و join خودکار)
// ===================================================================
export const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({
    parts: many(parts),
}));
export const partsRelations = relations(parts, ({ one }) => ({
    category: one(categories, {
        fields: [parts.categoryId],
        references: [categories.id],
    }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
    user: one(users, { fields: [orders.userId], references: [users.id] }),
    items: many(orderItems),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
    part: one(parts, { fields: [orderItems.partId], references: [parts.id] }),
}));
//# sourceMappingURL=schema.js.map