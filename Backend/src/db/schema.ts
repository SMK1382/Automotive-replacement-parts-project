import { relations } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', ['user', 'admin']);
export const paymentStatusEnum = pgEnum('paymentStatus', ['pending' ,'confirmed' ,'delivered' ,'cancelled'])


export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 11 }).notNull(),
  password: varchar('password', { length: 20 }).notNull(), // به‌صورت هش‌شده ذخیره می‌شود
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  address: varchar('address', {length: 255}),
  role: roleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


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
  status: paymentStatusEnum('status').default('pending').notNull(),
  totalAmount: integer('total_amount').default(0).notNull(), // مبلغ کل به تومان
  address: text('address').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ------------------------------------------------------------------
// جدول آیتم‌های هر سفارش (هر سفارش می‌تواند چند قطعه داشته باشد)
// ------------------------------------------------------------------
// export const orderItems = pgTable('order_items', {
//   id: serial('id').primaryKey(),
//   orderId: integer('order_id').references(() => orders.id).notNull(),
//   partId: integer('part_id').references(() => parts.id).notNull(),
//   quantity: integer('quantity').default(1).notNull(),
//   price: integer('price').notNull(), // قیمت قطعه در لحظه ثبت سفارش
// });

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

// ===================================================================
// تعریف نوع‌های TypeScript (توسط Drizzle خودکار ساخته می‌شوند)
// این نوع‌ها برای استفاده در کد کمک می‌کنند.
// ===================================================================
export type User = typeof users.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
