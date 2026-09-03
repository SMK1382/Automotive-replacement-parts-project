// ===================================================================
// اسکریپت پر کردن دیتابیس با داده‌های اولیه
// -------------------------------------------------------------------
// اجرا: npm run seed
// توجه: این اسکریپت جداول را خالی کرده و از نو پر می‌کند؛
// فقط برای محیط توسعه استفاده شود.
// ===================================================================

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  addresses,
  brands,
  carModels,
  categories,
  parts,
  productImages,
  partCompatibility,
  orders,
  orderItems,
  coupons,
  reviews,
  wishlist,
  banners,
  articles,
} from '../db/schema.js';

async function main() {
  console.log('🌱 شروع پر کردن دیتابیس...');

  // ۰) خالی کردن جداول (ترتیب برای رعایت کلیدهای خارجی)
  await db.execute(sql`
    TRUNCATE TABLE
      order_items, orders, part_compatibility, product_images, parts,
      reviews, wishlist, addresses, categories, car_models, brands,
      coupons, banners, articles, contact_messages, users
    RESTART IDENTITY CASCADE
  `);

  // ۱) کاربران: ادمین + کاربر نمونه
  const [admin, , demoUser] = await db
    .insert(users)
    .values([
      {
        firstName: 'سوپر',
        lastName: 'مدیر',
        email: 'admin@parts.ir',
        password: await bcrypt.hash('admin123', 10),
        phone: '09121110000',
        role: 'super_admin',
      },
      {
        firstName: 'مدیر',
        lastName: 'فروشگاه',
        email: 'manager@parts.ir',
        password: await bcrypt.hash('manager123', 10),
        phone: '09121112222',
        role: 'admin',
      },
      {
        firstName: 'کاربر',
        lastName: 'نمونه',
        email: 'demo@parts.ir',
        password: await bcrypt.hash('demo1234', 10),
        phone: '09121220000',
        role: 'user',
      },
    ])
    .returning();
  console.log('✅ کاربران ساخته شدند (سوپر ادمین: admin@parts.ir / admin123 — ادمین فروشگاه: manager@parts.ir / manager123)');

  // ۲) آدرس پیش‌فرض برای کاربر نمونه
  await db.insert(addresses).values({
    userId: demoUser.id,
    receiverName: 'کاربر نمونه',
    receiverPhone: '09121220000',
    province: 'تهران',
    city: 'تهران',
    postalCode: '1234567890',
    line: 'خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳',
    isDefault: true,
  });

  // ۳) برندها
  const brandRows = await db
    .insert(brands)
    .values([
      {
        name: 'تویوتا',
        slug: 'toyota',
        description: 'قطعات اورجینال و باکیفیت خودروهای تویوتا',
        sortOrder: 1,
      },
      {
        name: 'لکسوس',
        slug: 'lexus',
        description: 'لوازم یدکی اصلی خودروهای لوکس لکسوس',
        sortOrder: 2,
      },
      {
        name: 'هیوندای',
        slug: 'hyundai',
        description: 'قطعات اصلی و جایگزین خودروهای هیوندای',
        sortOrder: 3,
      },
      {
        name: 'کیا',
        slug: 'kia',
        description: 'لوازم یدکی خودروهای کیا با گارانتی اصالت',
        sortOrder: 4,
      },
    ])
    .returning();
  const brandId = (slug: string) => brandRows.find((b) => b.slug === slug)!.id;

  // ۴) مدل‌های خودرو
  const modelRows = await db
    .insert(carModels)
    .values([
      { brandId: brandId('toyota'), name: 'کرولا', slug: 'corolla' },
      { brandId: brandId('toyota'), name: 'کمری', slug: 'camry' },
      { brandId: brandId('toyota'), name: 'راو۴', slug: 'rav4' },
      { brandId: brandId('toyota'), name: 'یاریس', slug: 'yaris' },
      { brandId: brandId('toyota'), name: 'لندکروز', slug: 'land-cruiser' },
      { brandId: brandId('toyota'), name: 'پرادو', slug: 'prado' },
      { brandId: brandId('toyota'), name: 'هایلوکس', slug: 'hilux' },
      { brandId: brandId('lexus'), name: 'ES', slug: 'es' },
      { brandId: brandId('lexus'), name: 'RX', slug: 'rx' },
      { brandId: brandId('lexus'), name: 'NX', slug: 'nx' },
      { brandId: brandId('hyundai'), name: 'النترا', slug: 'elantra' },
      { brandId: brandId('hyundai'), name: 'سوناتا', slug: 'sonata' },
      { brandId: brandId('hyundai'), name: 'توسن', slug: 'tucson' },
      { brandId: brandId('hyundai'), name: 'سانتافه', slug: 'santa-fe' },
      { brandId: brandId('kia'), name: 'سراتو', slug: 'cerato' },
      { brandId: brandId('kia'), name: 'اسپورتیج', slug: 'sportage' },
      { brandId: brandId('kia'), name: 'سورنتو', slug: 'sorento' },
    ])
    .returning();
  const modelId = (slug: string) => modelRows.find((m) => m.slug === slug)!.id;

  // ۵) دسته‌بندی‌ها (والد + زیردسته)
  const parentRows = await db
    .insert(categories)
    .values([
      { name: 'قطعات موتور', slug: 'engine', iconEmoji: '🔧', sortOrder: 1 },
      { name: 'سیستم ترمز', slug: 'brakes', iconEmoji: '🛑', sortOrder: 2 },
      { name: 'سیستم تعلیق', slug: 'suspension', iconEmoji: '🔩', sortOrder: 3 },
      { name: 'برق و باتری', slug: 'electrical', iconEmoji: '🔋', sortOrder: 4 },
      { name: 'بدنه و چراغ', slug: 'body-lights', iconEmoji: '💡', sortOrder: 5 },
      { name: 'سیستم خنک‌کاری', slug: 'cooling', iconEmoji: '❄️', sortOrder: 6 },
      { name: 'انتقال قدرت', slug: 'drivetrain', iconEmoji: '⚙️', sortOrder: 7 },
      { name: 'لوازم مصرفی سرویس', slug: 'service', iconEmoji: '🧰', sortOrder: 8 },
    ])
    .returning();
  const catId = (slug: string) => parentRows.find((c) => c.slug === slug)!.id;

  const childRows = await db
    .insert(categories)
    .values([
      { name: 'فیلتر و روغن', slug: 'filters-oil', parentId: catId('engine'), sortOrder: 1 },
      { name: 'تسمه و زنجیر', slug: 'belts', parentId: catId('engine'), sortOrder: 2 },
      { name: 'لنت ترمز', slug: 'brake-pads', parentId: catId('brakes'), sortOrder: 1 },
      { name: 'دیسک و کاسه', slug: 'brake-discs', parentId: catId('brakes'), sortOrder: 2 },
      { name: 'کمک‌فنر', slug: 'shock-absorbers', parentId: catId('suspension'), sortOrder: 1 },
      { name: 'بوش و سایلنت‌بلاک', slug: 'bushings', parentId: catId('suspension'), sortOrder: 2 },
      { name: 'باتری', slug: 'batteries', parentId: catId('electrical'), sortOrder: 1 },
      { name: 'دینام و استارت', slug: 'alternators', parentId: catId('electrical'), sortOrder: 2 },
      { name: 'سنسور', slug: 'sensors', parentId: catId('electrical'), sortOrder: 3 },
      { name: 'چراغ', slug: 'lamps', parentId: catId('body-lights'), sortOrder: 1 },
      { name: 'آینه و شیشه', slug: 'mirrors', parentId: catId('body-lights'), sortOrder: 2 },
      { name: 'رادیاتور', slug: 'radiators', parentId: catId('cooling'), sortOrder: 1 },
      { name: 'فن و ترموستات', slug: 'fans', parentId: catId('cooling'), sortOrder: 2 },
      { name: 'کلاچ', slug: 'clutch', parentId: catId('drivetrain'), sortOrder: 1 },
      { name: 'شمع و برق‌واخته', slug: 'spark-plugs', parentId: catId('service'), sortOrder: 1 },
      { name: 'برف‌پاک‌کن', slug: 'wipers', parentId: catId('service'), sortOrder: 2 },
    ])
    .returning();
  const subId = (slug: string) => childRows.find((c) => c.slug === slug)!.id;

  // ۶) قطعات — تصاویر به SVGهای محلی بدون حق‌وحقوق اشاره می‌کنند
  // ساختار هر آیتم: [داده‌های قطعه، سازگاری‌ها]
  const partData: Array<{
    name: string;
    slug: string;
    description: string;
    price: number;
    discountPrice?: number;
    stock: number;
    partNumber: string;
    weightGrams: number;
    categoryId: number;
    brandId?: number;
    isFeatured?: boolean;
    image: string;
    compatibility: Array<[modelSlug: string, years: string]>;
  }> = [
    {
      name: 'لنت ترمز جلو تویوتا کرولا',
      slug: 'toyota-corolla-front-brake-pads',
      description:
        'لنت ترمز جلو با کیفیت اصلی، دارای نشانگر سایش؛ مناسب رانندگی شهری و جاده‌ای. هر بسته شامل یک جفت لنت چپ و راست است.',
      price: 1850000,
      discountPrice: 1590000,
      stock: 24,
      partNumber: '04465-02220',
      weightGrams: 2400,
      categoryId: subId('brake-pads'),
      brandId: brandId('toyota'),
      isFeatured: true,
      image: '/images/parts/brake-pads.svg',
      compatibility: [
        ['corolla', '2014-2019'],
        ['corolla', '2019-2024'],
      ],
    },
    {
      name: 'لنت ترمز عقب تویوتا کمری',
      slug: 'toyota-camry-rear-brake-pads',
      description: 'لنت ترمز عقب اصلی، کم‌صدا و بدون گردتراشه؛ مناسب مدل‌های جدید کمری.',
      price: 2100000,
      stock: 15,
      partNumber: '04466-06220',
      weightGrams: 2100,
      categoryId: subId('brake-pads'),
      brandId: brandId('toyota'),
      image: '/images/parts/brake-pads.svg',
      compatibility: [
        ['camry', '2018-2024'],
      ],
    },
    {
      name: 'دیسک ترمز جلو تویوتا راو۴',
      slug: 'toyota-rav4-front-brake-disc',
      description: 'دیسک ترمز جلو آبکاری‌شده ضدزنگ با ماشین‌کاری دقیق؛ جفت چپ و راست.',
      price: 4350000,
      discountPrice: 3990000,
      stock: 9,
      partNumber: '43512-0E010',
      weightGrams: 12500,
      categoryId: subId('brake-discs'),
      brandId: brandId('toyota'),
      isFeatured: true,
      image: '/images/parts/brake-disc.svg',
      compatibility: [['rav4', '2019-2024']],
    },
    {
      name: 'فیلتر روغن موتور تویوتا',
      slug: 'toyota-oil-filter-90915',
      description:
        'فیلتر روغن اصلی تویوتا با صافی بالا و دوام طولانی؛ تعویض در هر سرویس دوره‌ای توصیه می‌شود.',
      price: 320000,
      discountPrice: 265000,
      stock: 80,
      partNumber: '90915-YZZE1',
      weightGrams: 200,
      categoryId: subId('filters-oil'),
      brandId: brandId('toyota'),
      isFeatured: true,
      image: '/images/parts/oil-filter.svg',
      compatibility: [
        ['corolla', '2014-2024'],
        ['camry', '2018-2024'],
        ['rav4', '2019-2024'],
        ['yaris', '2017-2023'],
      ],
    },
    {
      name: 'فیلتر هوا کیا سراتو',
      slug: 'kia-cerato-air-filter',
      description: 'فیلتر هوای موتور با کاغذ صافی چندلایه؛ جلوگیری از ورود گردوغبار به موتور.',
      price: 480000,
      stock: 42,
      partNumber: '28113-1W000',
      weightGrams: 350,
      categoryId: subId('filters-oil'),
      brandId: brandId('kia'),
      image: '/images/parts/air-filter.svg',
      compatibility: [
        ['cerato', '2018-2024'],
        ['sportage', '2016-2021'],
      ],
    },
    {
      name: 'فیلتر کابین (اتاق) هیوندای النترا',
      slug: 'hyundai-elantra-cabin-filter',
      description: 'فیلتر کابین کربن‌دار برای تصفیه هوای داخل خودرو و کاهش بو و آلرژن.',
      price: 590000,
      discountPrice: 490000,
      stock: 35,
      partNumber: '97133-2H100',
      weightGrams: 300,
      categoryId: subId('filters-oil'),
      brandId: brandId('hyundai'),
      image: '/images/parts/cabin-filter.svg',
      compatibility: [['elantra', '2016-2023']],
    },
    {
      name: 'شمع موتور ایریدیومی تویوتا',
      slug: 'toyota-iridium-spark-plug',
      description: 'شمع ایریدیومی اصلی با عمر بالا و جرقه پایدار؛ بسته ۴ عددی.',
      price: 1980000,
      stock: 30,
      partNumber: '90919-01253',
      weightGrams: 480,
      categoryId: subId('spark-plugs'),
      brandId: brandId('toyota'),
      isFeatured: true,
      image: '/images/parts/spark-plug.svg',
      compatibility: [
        ['corolla', '2014-2022'],
        ['camry', '2012-2019'],
      ],
    },
    {
      name: 'تسمه تایم تویوتا کمری ۲.۵',
      slug: 'toyota-camry-25-timing-belt',
      description: 'تسمه تایم با لاستیک تقویت‌شده و مقاومت حرارتی بالا؛ توصیه به تعویض همزمان با پمپ آب.',
      price: 3250000,
      stock: 11,
      partNumber: '13568-09070',
      weightGrams: 700,
      categoryId: subId('belts'),
      brandId: brandId('toyota'),
      image: '/images/parts/belt.svg',
      compatibility: [['camry', '2012-2019']],
    },
    {
      name: 'کمک‌فنر جلو تویوتا کرولا',
      slug: 'toyota-corolla-front-shock-absorber',
      description: 'کمک‌فنر جلو با روانکاری دقیق و مناسب شرایط جاده‌ای ایران؛ قیمت هر عدد.',
      price: 4850000,
      discountPrice: 4490000,
      stock: 16,
      partNumber: '48510-02810',
      weightGrams: 4200,
      categoryId: subId('shock-absorbers'),
      brandId: brandId('toyota'),
      isFeatured: true,
      image: '/images/parts/shock-absorber.svg',
      compatibility: [['corolla', '2014-2019']],
    },
    {
      name: 'مثلث تعلیق هیوندای سوناتا',
      slug: 'hyundai-sonata-control-arm',
      description: 'مثلث تعلیق با بوش پلی‌اورتان و توپی با کیفیت؛ سمت چپ و راست یکسان.',
      price: 3900000,
      stock: 12,
      partNumber: '54500-3X000',
      weightGrams: 3800,
      categoryId: subId('bushings'),
      brandId: brandId('hyundai'),
      image: '/images/parts/control-arm.svg',
      compatibility: [['sonata', '2015-2020']],
    },
    {
      name: 'باتری ۷۰ آمپر اتمی',
      slug: '70ah-agm-battery',
      description: 'باتری اتمی ۷۰ آمپر‌ساعت با استارت مطمئن در سرما و گارانتی ۱۸ ماهه؛ مناسب خودروهای پرآپشن.',
      price: 8900000,
      discountPrice: 8250000,
      stock: 14,
      partNumber: 'AGM-70L',
      weightGrams: 19000,
      categoryId: subId('batteries'),
      image: '/images/parts/battery.svg',
      isFeatured: true,
      compatibility: [],
    },
    {
      name: 'دینام تویوتا پرادو',
      slug: 'toyota-prado-alternator',
      description: 'دینام اصلی ۱۲۰ آمپر با رگولاتور داخلی؛ بازسازی‌شده کارخانه‌ای با گارانتی ۶ ماه.',
      price: 15900000,
      stock: 4,
      partNumber: '27060-0C070',
      weightGrams: 5600,
      categoryId: subId('alternators'),
      brandId: brandId('toyota'),
      image: '/images/parts/alternator.svg',
      compatibility: [['prado', '2010-2019']],
    },
    {
      name: 'سنسور اکسیژن لکسوس ES',
      slug: 'lexus-es-o2-sensor',
      description: 'سنسور اکسیژن اصلی برای کنترل دقیق مخلوط سوخت و کاهش مصرف.',
      price: 4650000,
      stock: 7,
      partNumber: '89467-74020',
      weightGrams: 250,
      categoryId: subId('sensors'),
      brandId: brandId('lexus'),
      image: '/images/parts/sensor.svg',
      compatibility: [['es', '2013-2021']],
    },
    {
      name: 'چراغ جلو راست لکسوس NX',
      slug: 'lexus-nx-right-headlight',
      description: 'چراغ جلو تمام‌LED راست با هوزینگ اورجینال؛ دارای تنظیم نور اتوماتیک.',
      price: 68500000,
      discountPrice: 63900000,
      stock: 2,
      partNumber: '81110-78460',
      weightGrams: 5200,
      categoryId: subId('lamps'),
      brandId: brandId('lexus'),
      image: '/images/parts/headlight.svg',
      compatibility: [['nx', '2018-2024']],
    },
    {
      name: 'آینه بغل چپ کیا اسپورتیج',
      slug: 'kia-sportage-left-mirror',
      description: 'آینه بغل برقی با گرم‌کن و چراغ راهنما؛ شامل شیشه و بدنه.',
      price: 7500000,
      stock: 6,
      partNumber: '87610-D9100',
      weightGrams: 1500,
      categoryId: subId('mirrors'),
      brandId: brandId('kia'),
      image: '/images/parts/mirror.svg',
      compatibility: [['sportage', '2016-2021']],
    },
    {
      name: 'رادیاتور آب تویوتا لندکروز',
      slug: 'toyota-land-cruiser-radiator',
      description: 'رادیاتور آلومینیومی با core تقویت‌شده؛ مناسب آب‌وهوای گرم و کاربری سنگین.',
      price: 18500000,
      stock: 5,
      partNumber: '16400-0L030',
      weightGrams: 8200,
      categoryId: subId('radiators'),
      brandId: brandId('toyota'),
      image: '/images/parts/radiator.svg',
      compatibility: [['land-cruiser', '2008-2021']],
    },
    {
      name: 'فن رادیاتور هیوندای توسن',
      slug: 'hyundai-tucson-radiator-fan',
      description: 'فن رادیاتور کامل با موتور و پره؛ خنک‌کاری مطمئن در ترافیک.',
      price: 9800000,
      discountPrice: 9200000,
      stock: 8,
      partNumber: '25380-2E000',
      weightGrams: 3400,
      categoryId: subId('fans'),
      brandId: brandId('hyundai'),
      image: '/images/parts/fan.svg',
      compatibility: [['tucson', '2016-2022']],
    },
    {
      name: 'دیسک کلاچ کیا سورنتو دیزل',
      slug: 'kia-sorento-clutch-disc',
      description: 'دیسک و صفحه کلاچ کامل؛ اصطکاک بالا و دوام طولانی برای موتور دیزل.',
      price: 12500000,
      stock: 6,
      partNumber: '41100-3K000',
      weightGrams: 6800,
      categoryId: subId('clutch'),
      brandId: brandId('kia'),
      image: '/images/parts/clutch.svg',
      compatibility: [['sorento', '2015-2020']],
    },
    {
      name: 'پمپ آب تویوتا هایلوکس',
      slug: 'toyota-hilux-water-pump',
      description: 'پمپ آب اصلی با پروانه فلزی و آب‌بندی مطمئن؛ تعویض همزمان با تسمه تایم توصیه می‌شود.',
      price: 6900000,
      stock: 9,
      partNumber: '16100-0L040',
      weightGrams: 2100,
      categoryId: subId('fans'),
      brandId: brandId('toyota'),
      image: '/images/parts/water-pump.svg',
      compatibility: [['hilux', '2006-2019']],
    },
    {
      name: 'برف‌پاک‌کن سیلیکونی (جفت)',
      slug: 'silicone-wiper-pair',
      description: 'ست برف‌پاک‌کن سیلیکونی بی‌صدا با تیغه گرافیتی؛ مناسب اکثر خودروهای سدان.',
      price: 1150000,
      discountPrice: 950000,
      stock: 55,
      partNumber: 'WIP-SIL-24',
      weightGrams: 600,
      categoryId: subId('wipers'),
      image: '/images/parts/wiper.svg',
      compatibility: [],
    },
    {
      name: 'فیلتر روغن هیوندای سانتافه',
      slug: 'hyundai-santa-fe-oil-filter',
      description: 'فیلتر روغن اصلی هیوندای با سوپاپ یک‌طرفه ضدبرگشت.',
      price: 350000,
      stock: 60,
      partNumber: '26300-35505',
      weightGrams: 220,
      categoryId: subId('filters-oil'),
      brandId: brandId('hyundai'),
      image: '/images/parts/oil-filter.svg',
      compatibility: [
        ['santa-fe', '2013-2023'],
        ['sonata', '2015-2020'],
      ],
    },
    {
      name: 'لنت ترمز جلو کیا سراتو',
      slug: 'kia-cerato-front-brake-pads',
      description: 'لنت ترمز جلو با ترکیب سرامیکی کم‌گرد؛ پایداری بالا در دمای زیاد.',
      price: 1690000,
      stock: 20,
      partNumber: '58101-H5A00',
      weightGrams: 2300,
      categoryId: subId('brake-pads'),
      brandId: brandId('kia'),
      image: '/images/parts/brake-pads.svg',
      compatibility: [['cerato', '2018-2024']],
    },
    {
      name: 'کمک‌فنر عقب لکسوس RX',
      slug: 'lexus-rx-rear-shock',
      description: 'کمک‌فنر عقب با تنظیم الکترونیکی؛ راحتی سفر و پایداری عالی.',
      price: 11500000,
      stock: 8,
      partNumber: '48531-48790',
      weightGrams: 4600,
      categoryId: subId('shock-absorbers'),
      brandId: brandId('lexus'),
      isFeatured: true,
      image: '/images/parts/shock-absorber.svg',
      compatibility: [['rx', '2016-2023']],
    },
    {
      name: 'سنسور دنده عقب تویوتا یاریس',
      slug: 'toyota-yaris-parking-sensor',
      description: 'سنسور پارکنینگ اورجینال با رنگ‌پذیری؛ افزایش ایمنی هنگام دنده عقب.',
      price: 1450000,
      stock: 18,
      partNumber: '89341-52J60',
      weightGrams: 90,
      categoryId: subId('sensors'),
      brandId: brandId('toyota'),
      image: '/images/parts/sensor.svg',
      compatibility: [['yaris', '2017-2023']],
    },
    {
      name: 'چراغ عقب چپ هیوندای النترا',
      slug: 'hyundai-elantra-left-taillight',
      description: 'چراغ عقب چپ با LED و هوزینگ اورجینال؛ نصب بدون تغییرات.',
      price: 12800000,
      discountPrice: 11900000,
      stock: 4,
      partNumber: '92401-H5000',
      weightGrams: 2200,
      categoryId: subId('lamps'),
      brandId: brandId('hyundai'),
      image: '/images/parts/taillight.svg',
      compatibility: [['elantra', '2016-2023']],
    },
    {
      name: 'باتری ۶۰ آمپر سلولی',
      slug: '60ah-battery',
      description: 'باتری ۶۰ آمپر‌ساعت مناسب سدان‌های کم‌مصرف؛ گارانتی ۱۲ ماه.',
      price: 6200000,
      stock: 20,
      partNumber: 'MF-60L',
      weightGrams: 15500,
      categoryId: subId('batteries'),
      image: '/images/parts/battery.svg',
      compatibility: [],
    },
    {
      name: 'دیسک ترمز عقب کیا اسپورتیج',
      slug: 'kia-sportage-rear-brake-disc',
      description: 'دیسک ترمز عقب با پوشش ضدزنگ؛ جفت.',
      price: 3750000,
      stock: 10,
      partNumber: '58411-D9050',
      weightGrams: 9800,
      categoryId: subId('brake-discs'),
      brandId: brandId('kia'),
      image: '/images/parts/brake-disc.svg',
      compatibility: [['sportage', '2016-2021']],
    },
    {
      name: 'بوش مثلث پلی‌اورتان تویوتا راو۴',
      slug: 'toyota-rav4-control-arm-bushing',
      description: 'ست بوش پلی‌اورتان با دوام ۲ برابر بوش لاستیکی معمولی.',
      price: 1650000,
      discountPrice: 1450000,
      stock: 26,
      partNumber: '48655-42040',
      weightGrams: 700,
      categoryId: subId('bushings'),
      brandId: brandId('toyota'),
      image: '/images/parts/bushing.svg',
      compatibility: [['rav4', '2013-2024']],
    },
    {
      name: 'ترموستات تویوتا کمری',
      slug: 'toyota-camry-thermostat',
      description: 'ترموستات اصلی با دمای بازشوی استاندارد؛ حفظ دمای بهینه موتور.',
      price: 1250000,
      stock: 22,
      partNumber: '90916-03093',
      weightGrams: 300,
      categoryId: subId('fans'),
      brandId: brandId('toyota'),
      image: '/images/parts/thermostat.svg',
      compatibility: [['camry', '2012-2024']],
    },
    {
      name: 'کیت کلاچ کامل لکسوس ES',
      slug: 'lexus-es-clutch-kit',
      description: 'کیت کامل دیسک، صفحه و بلبرینگ کلاچ؛ برای مدل‌های گیربکس دستی.',
      price: 19800000,
      stock: 3,
      partNumber: '31250-06350',
      weightGrams: 9200,
      categoryId: subId('clutch'),
      brandId: brandId('lexus'),
      image: '/images/parts/clutch.svg',
      compatibility: [['es', '2010-2018']],
    },
    {
      name: 'فیلتر بنزین تویوتا لندکروز',
      slug: 'toyota-land-cruiser-fuel-filter',
      description: 'فیلتر سوخت با صافی ریز برای محافظت از پاشنه‌های سوخت.',
      price: 2350000,
      stock: 13,
      partNumber: '23300-0L081',
      weightGrams: 550,
      categoryId: subId('filters-oil'),
      brandId: brandId('toyota'),
      image: '/images/parts/fuel-filter.svg',
      compatibility: [['land-cruiser', '2008-2021']],
    },
  ];

  const partRows = await db
    .insert(parts)
    .values(
      partData.map((p) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        discountPrice: p.discountPrice ?? null,
        stock: p.stock,
        partNumber: p.partNumber,
        weightGrams: p.weightGrams,
        categoryId: p.categoryId,
        brandId: p.brandId ?? null,
        isFeatured: p.isFeatured ?? false,
        metaTitle: `${p.name} | خرید با بهترین قیمت`,
        metaDescription: p.description.slice(0, 300),
      })),
    )
    .returning();

  // ۷) تصاویر و سازگاری قطعات
  const imageValues = partRows.map((row, i) => ({
    partId: row.id,
    url: partData[i]!.image,
    alt: partData[i]!.name,
    sortOrder: 0,
  }));
  await db.insert(productImages).values(imageValues);

  const compatValues = partRows.flatMap((row, i) =>
    partData[i]!.compatibility.map(([modelSlug, years]) => ({
      partId: row.id,
      carModelId: modelId(modelSlug),
      yearsNote: years,
    })),
  );
  if (compatValues.length > 0) await db.insert(partCompatibility).values(compatValues);

  // ۸) بنرها
  await db.insert(banners).values([
    {
      title: 'قطعات اورجینال با گارانتی اصالت',
      subtitle: 'ارسال سریع به سراسر کشور',
      imageUrl: '/images/banners/hero-1.svg',
      linkUrl: '/products',
      placement: 'hero',
      sortOrder: 1,
    },
    {
      title: 'سرویس دوره‌ای با تخفیف',
      subtitle: 'فیلتر روغن، فیلتر هوا و شمع',
      imageUrl: '/images/banners/hero-2.svg',
      linkUrl: '/categories/service',
      placement: 'hero',
      sortOrder: 2,
    },
    {
      title: 'تا ۱۵٪ تخفیف لوازم ترمز',
      subtitle: 'ایمنی خود را جدی بگیرید',
      imageUrl: '/images/banners/strip-1.svg',
      linkUrl: '/categories/brakes',
      placement: 'strip',
      sortOrder: 1,
    },
  ]);

  // ۹) کدهای تخفیف
  await db.insert(coupons).values([
    {
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      minSubtotal: 1000000,
      maxUses: 1000,
    },
    {
      code: 'SERVICE200',
      type: 'fixed',
      value: 200000,
      minSubtotal: 3000000,
      maxUses: 200,
    },
  ]);

  // ۱۰) نظرات نمونه (تأییدشده)
  const oilFilter = partRows.find((p) => p.slug === 'toyota-oil-filter-90915')!;
  const brakePads = partRows.find((p) => p.slug === 'toyota-corolla-front-brake-pads')!;
  await db.insert(reviews).values([
    {
      partId: oilFilter.id,
      userId: demoUser.id,
      rating: 5,
      comment: 'کاملاً اورجینال بود و بسته‌بندی سالم. قیمت هم مناسب بود.',
      status: 'approved',
    },
    {
      partId: brakePads.id,
      userId: demoUser.id,
      rating: 4,
      comment: 'کیفیت خوب، صدای ترمز بعد از نصب کاملاً برطرف شد.',
      status: 'approved',
    },
  ]);

  // ۱۱) علاقه‌مندی نمونه
  await db.insert(wishlist).values([
    { userId: demoUser.id, partId: brakePads.id },
  ]);

  // ۱۲) دو سفارش نمونه برای کاربر دمو
  const sampleItems = [
    { part: oilFilter, qty: 2 },
    { part: brakePads, qty: 1 },
  ];
  const subtotal = sampleItems.reduce(
    (sum, it) => sum + (it.part.discountPrice ?? it.part.price) * it.qty,
    0,
  );

  const [deliveredOrder] = await db
    .insert(orders)
    .values({
      userId: demoUser.id,
      status: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      receiverName: 'کاربر نمونه',
      receiverPhone: '09121220000',
      province: 'تهران',
      city: 'تهران',
      postalCode: '1234567890',
      addressLine: 'خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳',
      itemsSubtotal: subtotal,
      discountAmount: 0,
      shippingCost: 0,
      totalAmount: subtotal,
      trackingCode: 'IR-1234567890',
    })
    .returning();

  await db.insert(orderItems).values(
    sampleItems.map((it) => ({
      orderId: deliveredOrder.id,
      partId: it.part.id,
      partName: it.part.name,
      partNumber: it.part.partNumber,
      imageUrl: partData.find((p) => p.slug === it.part.slug)!.image,
      quantity: it.qty,
      unitPrice: it.part.discountPrice ?? it.part.price,
    })),
  );

  // ۱۳) مقالات بلاگ
  await db.insert(articles).values([
    {
      title: 'چگونه لوازم یدکی اصل را از تقلبی تشخیص دهیم؟',
      slug: 'identify-genuine-parts',
      excerpt:
        'با این چند نشانه ساده، قبل از خرید قطعه می‌توانید از اصل بودن آن مطمئن‌تر شوید.',
      content:
        'بازار لوازم یدکی پر است از قطعات تقلبی که ظاهری مشابه اصل دارند اما کیفیت آن‌ها به‌مراتب پایین‌تر است.\n\n## بررسی کد فنی\nهر قطعه اورجینال یک کد فنی یکتا دارد که با دفترچه خودرو یا قطعه قبلی قابل تطبیق است. قطعات تقلبی معمولاً کد ندارند یا از کد تکراری استفاده می‌کنند.\n\n## بسته‌بندی و هولوگرام\nشرکت‌های معتبر روی محصولات خود برچسب هولوگرام با ویژگی‌های امنیتی می‌گذارند. چاپ بی‌کیفیت و بسته‌بندی نامناسب از نشانه‌های قطعه غیراصل است.\n\n## قیمت غیرمعمول\nاگر قیمتی بسیار پایین‌تر از میانگین بازار به شما پیشنهاد شد، به احتمال زیاد قطعه تقلبی است.\n\nخرید از فروشگاه‌های معتبر با ضمانت اصالت کالا، ساده‌ترین راه برای اطمینان خاطر است.',
      coverImageUrl: '/images/blog/genuine-parts.svg',
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      title: 'راهنمای سرویس دوره‌ای خودروهای خارجی در ایران',
      slug: 'periodic-service-guide',
      excerpt:
        'چه چیزی را در هر چند کیلومتر تعویض کنیم؟ راهنمای کاربردی سرویس دوره‌ای برای خودروهای وارداتی.',
      content:
        'سرویس منظم، عمر خودرو را افزایش می‌دهد و از هزینه‌های سنگین تعمیر جلوگیری می‌کند.\n\n## هر ۵ هزار کیلومتر\nتعویض روغن موتور و فیلتر روغن. در رانندگی شهری پرترافیک این فاصله را کوتاه‌تر کنید.\n\n## هر ۱۰ هزار کیلومتر\nفیلتر هوا، بازرسی ترمزها و چرخ‌تعادلی.\n\n## هر ۴۰ هزار کیلومتر\nشمع‌ها، فیلتر کابین و بازرسی تسمه‌ها.\n\nهمیشه از قطعات سازگار با مدل دقیق خودروی خود استفاده کنید؛ کد فنی قطعه را پیش از سفارش کنترل کنید.',
      coverImageUrl: '/images/blog/service-guide.svg',
      isPublished: true,
      publishedAt: new Date(),
    },
  ]);

  console.log('✅ داده‌های اولیه ثبت شد:');
  console.log(`   برندها: ${brandRows.length} | مدل‌ها: ${modelRows.length}`);
  console.log(`   دسته‌ها: ${parentRows.length + childRows.length} | قطعات: ${partRows.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('سوپر ادمین: admin@parts.ir / admin123'); console.log('ادمین فروشگاه: manager@parts.ir / manager123');
  console.log('کاربر نمونه: demo@parts.ir / demo1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ خطا در seed:', err);
  process.exit(1);
});
