// ===================================================================
// مسیرهای سفارش
// -------------------------------------------------------------------
// POST   /api/orders           -> ثبت سفارش (کاربر لاگین‌شده) —
//                                 تراکنشی: بررسی و کسر موجودی + کوپن
// GET    /api/orders/mine      -> سفارش‌های کاربر فعلی (صفحه‌بندی)
// GET    /api/orders/track     -> پیگیری عمومی با شماره سفارش + موبایل
// GET    /api/orders/:id       -> جزئیات سفارش (مالک یا ادمین)
// PATCH  /api/orders/:id/cancel-> لغو توسط کاربر (فقط قبل از ارسال) و
//                                 بازگشت موجودی به انبار
// GET    /api/orders           -> همه سفارش‌ها (ادمین، فیلتر وضعیت)
// PATCH  /api/orders/:id       -> تغییر وضعیت/کد رهگیری (ادمین)
// ===================================================================

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  orders,
  orderItems,
  parts,
  productImages,
  coupons,
  addresses,
} from '../db/schema.js';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isIdParam, addressSchema, validateCityInProvince, paginationSchema, paginated } from '../lib/validators.js';
import { evaluateCoupon, findCouponByCode } from '../lib/coupon.js';
import { calcShippingCost } from '../lib/constants.js';

const router = Router();
// توجه: احراز هویت روی تک‌تک مسیرها اعمال می‌شود، چون /track عمومی است.

// ------------------------------------------------------------------
// POST / — ثبت سفارش
// بدنه: {
//   items: [{ partId, quantity }],
//   addressId?: number            — آدرس ذخیره‌شده
//   address?: {...}               — یا آدرس جدید
//   paymentMethod: 'cod' | 'card_transfer',
//   couponCode?: string, note?: string
// }
// ------------------------------------------------------------------
router.post('/', verifyToken, async (req, res) => {
  try {
    const schema = z.object({
      items: z
        .array(
          z.object({
            partId: z.number().int().positive(),
            quantity: z.number().int().positive().max(99),
          }),
        )
        .min(1, 'سبد خرید خالی است'),
      addressId: z.number().int().positive().optional(),
      address: addressSchema.optional(),
      paymentMethod: z.enum(['cod', 'card_transfer'], {
        errorMap: () => ({ message: 'روش پرداخت نامعتبر است' }),
      }),
      couponCode: z.string().optional(),
      note: z.string().max(500).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'ورودی نامعتبر',
      });
    }
    const { items, addressId, address, paymentMethod, couponCode, note } =
      parsed.data;
    const userId = req.user!.id;

    // ۱) تعیین آدرس ارسال (آدرس ذخیره‌شده یا آدرس جدید)
    let shipping: z.infer<typeof addressSchema>;
    if (addressId) {
      const [saved] = await db
        .select()
        .from(addresses)
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
        .limit(1);
      if (!saved)
        return res.status(400).json({ error: 'آدرس انتخاب‌شده معتبر نیست' });
      shipping = {
        receiverName: saved.receiverName,
        receiverPhone: saved.receiverPhone,
        province: saved.province,
        city: saved.city,
        postalCode: saved.postalCode,
        line: saved.line,
      };
    } else if (address) {
      const cityError = validateCityInProvince(address.province, address.city);
      if (cityError) return res.status(400).json({ error: cityError });
      shipping = address;
    } else {
      return res.status(400).json({ error: 'آدرس ارسال را انتخاب یا وارد کنید' });
    }

    // ۲) تراکنش: قفل ردیف قطعات، بررسی موجودی، کسر، ثبت سفارش
    const result = await db.transaction(async (tx) => {
      const partIds = items.map((i) => i.partId);

      // قفل ردیف‌ها برای جلوگیری از فروش هم‌زمان یک موجودی
      const lockedParts = await tx
        .select()
        .from(parts)
        .where(inArray(parts.id, partIds))
        .for('update');

      const partMap = new Map(lockedParts.map((p) => [p.id, p]));

      // بررسی قطعات و موجودی
      let itemsSubtotal = 0;
      const lines: {
        partId: number;
        partName: string;
        partNumber: string | null;
        imageUrl: string | null;
        quantity: number;
        unitPrice: number;
      }[] = [];

      for (const item of items) {
        const part = partMap.get(item.partId);
        if (!part) throw new Error(`CUT_NOT_FOUND:${item.partId}`);
        if (!part.isActive) throw new Error(`CUT_INACTIVE:${item.partId}`);
        if (part.stock < item.quantity)
          throw new Error(
            `CUT_OUT_OF_STOCK:${part.name}:${part.stock}:${item.quantity}`,
          );

        // قیمت مؤثر = قیمت با تخفیف اگر وجود داشت (قیمت همیشه از سرور)
        const unitPrice = part.discountPrice ?? part.price;
        itemsSubtotal += unitPrice * item.quantity;

        const [img] = await tx
          .select({ url: productImages.url })
          .from(productImages)
          .where(eq(productImages.partId, part.id))
          .limit(1);

        lines.push({
          partId: part.id,
          partName: part.name,
          partNumber: part.partNumber,
          imageUrl: img?.url ?? null,
          quantity: item.quantity,
          unitPrice,
        });
      }

      // ۳) بررسی و اعمال کد تخفیف (قفل ردیف کد)
      let discountAmount = 0;
      let appliedCoupon: string | null = null;
      if (couponCode) {
        const [lockedCoupon] = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.code, couponCode.trim().toUpperCase()))
          .for('update');
        if (!lockedCoupon) throw new Error('COUPON_NOT_FOUND');

        const evaluation = evaluateCoupon(lockedCoupon, itemsSubtotal);
        if (!evaluation.ok) throw new Error(`COUPON_INVALID:${evaluation.error}`);

        discountAmount = evaluation.discount;
        appliedCoupon = lockedCoupon.code;
        await tx
          .update(coupons)
          .set({ usedCount: lockedCoupon.usedCount + 1 })
          .where(eq(coupons.id, lockedCoupon.id));
      }

      // ۴) محاسبه ارسال و مبلغ نهایی
      const shippingCost = calcShippingCost(itemsSubtotal - discountAmount);
      const totalAmount = itemsSubtotal - discountAmount + shippingCost;

      // ۵) ساخت سفارش + آیتم‌ها
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          status: 'pending',
          paymentMethod,
          paymentStatus: 'unpaid',
          receiverName: shipping.receiverName,
          receiverPhone: shipping.receiverPhone,
          province: shipping.province,
          city: shipping.city,
          postalCode: shipping.postalCode,
          addressLine: shipping.line,
          note: note ?? null,
          itemsSubtotal,
          discountAmount,
          shippingCost,
          totalAmount,
          couponCode: appliedCoupon,
        })
        .returning();

      await tx.insert(orderItems).values(
        lines.map((l) => ({ orderId: order.id, ...l })),
      );

      // ۶) کسر موجودی
      for (const l of lines) {
        await tx
          .update(parts)
          .set({ stock: sql`${parts.stock} - ${l.quantity}` })
          .where(eq(parts.id, l.partId));
      }

      return order;
    });

    res.status(201).json(result);
  } catch (err) {
    // خطاهای منطقی تراکنش → پیام فارسی مشخص
    const message = err instanceof Error ? err.message : '';
    if (message.startsWith('CUT_NOT_FOUND')) {
      const id = message.split(':')[1];
      return res.status(400).json({ error: `قطعه با شناسه ${id} پیدا نشد` });
    }
    if (message.startsWith('CUT_INACTIVE')) {
      return res
        .status(400)
        .json({ error: 'یکی از قطعات سبد دیگر فعال نیست؛ سبد را به‌روز کنید' });
    }
    if (message.startsWith('CUT_OUT_OF_STOCK')) {
      const [, name, stock, qty] = message.split(':');
      return res.status(400).json({
        error: `موجودی «${name}» کافی نیست (موجودی: ${stock}، درخواست: ${qty})`,
      });
    }
    if (message === 'COUPON_NOT_FOUND') {
      return res.status(400).json({ error: 'کد تخفیف یافت نشد' });
    }
    if (message.startsWith('COUPON_INVALID')) {
      return res
        .status(400)
        .json({ error: message.split(':').slice(1).join(':') });
    }
    console.error(err);
    res.status(500).json({ error: 'خطا در ثبت سفارش' });
  }
});

// ------------------------------------------------------------------
// GET /mine — سفارش‌های کاربر فعلی
// ------------------------------------------------------------------
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse({
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 10,
    });

    const rows = await db.query.orders.findMany({
      where: eq(orders.userId, req.user!.id),
      with: { items: true },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset: (page - 1) * limit,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.userId, req.user!.id));

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت سفارش‌ها' });
  }
});

// ------------------------------------------------------------------
// GET /track?id=..&phone=.. — پیگیری عمومی سفارش
// شماره سفارش + شماره موبایل گیرنده باید با هم درست باشند؛
// فقط وضعیت و کد رهگیری برمی‌گردد (نه اطلاعات کامل).
// ------------------------------------------------------------------
router.get('/track', async (req, res) => {
  try {
    const id = Number(req.query.id);
    const phone = String(req.query.phone || '').trim();
    if (!Number.isInteger(id) || id <= 0 || !/^09\d{9}$/.test(phone)) {
      return res
        .status(400)
        .json({ error: 'شماره سفارش و موبایل معتبر وارد کنید' });
    }

    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        totalAmount: orders.totalAmount,
        trackingCode: orders.trackingCode,
        createdAt: orders.createdAt,
        receiverPhone: orders.receiverPhone,
      })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order || order.receiverPhone !== phone) {
      return res
        .status(404)
        .json({ error: 'سفارشی با این شماره و موبایل پیدا نشد' });
    }

    res.json({
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      trackingCode: order.trackingCode,
      createdAt: order.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در پیگیری سفارش' });
  }
});

// ------------------------------------------------------------------
// GET /:id — جزئیات سفارش (مالک یا ادمین)
// ------------------------------------------------------------------
router.get('/:id', verifyToken, async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'سفارش پیدا نشد' });
    const id = Number(req.params.id);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!order) return res.status(404).json({ error: 'سفارش پیدا نشد' });

    // فقط مالک سفارش یا ادمین اجازه دیدن دارد
    if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    res.json({ ...order, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت سفارش' });
  }
});

// ------------------------------------------------------------------
// PATCH /:id/cancel — لغو سفارش توسط کاربر (فقط قبل از پردازش)
// موجودی قطعات به انبار برمی‌گردد.
// ------------------------------------------------------------------
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'سفارش پیدا نشد' });
    const id = Number(req.params.id);

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .for('update');
      if (!order) throw new Error('NOT_FOUND');
      if (order.userId !== req.user!.id) throw new Error('FORBIDDEN');
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new Error('NOT_CANCELLABLE');
      }

      // بازگشت موجودی
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));
      for (const item of items) {
        await tx
          .update(parts)
          .set({ stock: sql`${parts.stock} + ${item.quantity}` })
          .where(eq(parts.id, item.partId));
      }

      // بازگرداندن ظرفیت کد تخفیف
      if (order.couponCode) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` })
          .where(eq(coupons.code, order.couponCode));
      }

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
          paymentStatus: order.paymentStatus === 'paid' ? 'refunded' : 'unpaid',
        })
        .where(eq(orders.id, id))
        .returning();
      return updated;
    });

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'NOT_FOUND')
      return res.status(404).json({ error: 'سفارش پیدا نشد' });
    if (message === 'FORBIDDEN')
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    if (message === 'NOT_CANCELLABLE')
      return res.status(400).json({
        error: 'این سفارش در حال پردازش است و قابل لغو نیست؛ با پشتیبانی تماس بگیرید',
      });
    console.error(err);
    res.status(500).json({ error: 'خطا در لغو سفارش' });
  }
});

// ------------------------------------------------------------------
// GET / — همه سفارش‌ها (ادمین) با فیلتر وضعیت و صفحه‌بندی
// ------------------------------------------------------------------
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { page, limit } = paginationSchema.parse({
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 10,
    });
    const status = req.query.status as string | undefined;

    const where =
      status && status !== 'all'
        ? sql`${orders.status} = ${status}`
        : undefined;

    const rows = await db.query.orders.findMany({
      where,
      with: {
        items: true,
        user: { columns: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset: (page - 1) * limit,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(where);

    res.json(paginated(rows, count, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت سفارش‌ها' });
  }
});

// ------------------------------------------------------------------
// PATCH /:id — بروزرسانی توسط ادمین (وضعیت / کد رهگیری / پرداخت)
// ------------------------------------------------------------------
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!isIdParam(req.params.id))
      return res.status(404).json({ error: 'سفارش پیدا نشد' });
    const id = Number(req.params.id);

    const schema = z.object({
      status: z
        .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
        .optional(),
      paymentStatus: z.enum(['unpaid', 'paid', 'refunded']).optional(),
      trackingCode: z.string().max(60).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'مقادیر ارسالی نامعتبر است' });
    }

    // اگر ادمین سفارش را لغو کند، موجودی به انبار برمی‌گردد
    const isCancelling = parsed.data.status === 'cancelled';

    const updated = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);
      if (!order) throw new Error('NOT_FOUND');

      if (isCancelling && order.status !== 'cancelled') {
        const items = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, id));
        for (const item of items) {
          await tx
            .update(parts)
            .set({ stock: sql`${parts.stock} + ${item.quantity}` })
            .where(eq(parts.id, item.partId));
        }
        if (order.couponCode) {
          await tx
            .update(coupons)
            .set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` })
            .where(eq(coupons.code, order.couponCode));
        }
      }

      const [row] = await tx
        .update(orders)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      return row;
    });

    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'NOT_FOUND')
      return res.status(404).json({ error: 'سفارش پیدا نشد' });
    console.error(err);
    res.status(500).json({ error: 'خطا در به‌روزرسانی سفارش' });
  }
});

export default router;
