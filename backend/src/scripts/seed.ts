// ===================================================================
// اسکریپت پر کردن دیتابیس با داده‌های اولیه
// -------------------------------------------------------------------
// اجرا: npm run seed
// این اسکریپت یک کاربر ادمین، چند دسته‌بندی و چند قطعه نمونه می‌سازد.
// ===================================================================

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, categories, parts } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🌱 شروع پر کردن دیتابیس...');

  // ۱) ساخت کاربر ادمین (اگر وجود نداشت)
  const adminEmail = 'admin@parts.ir';
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      name: 'مدیر سایت',
      email: adminEmail,
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
    });
    console.log('✅ کاربر ادمین ساخته شد:', adminEmail);
  } else {
    console.log('ℹ️  کاربر ادمین از قبل وجود دارد');
  }

  // ۲) ساخت دسته‌بندی‌ها
  const cats = await db
    .insert(categories)
    .values([
      { name: 'موتور' },
      { name: 'ترمز' },
      { name: 'تعلیق' },
      { name: 'برق' },
    ])
    .returning();

  // تابع کمکی برای گرفتن آی‌دی دسته با نام
  const catId = (name: string) =>
    cats.find((c) => c.name === name)!.id;

  // ۳) ساخت قطعات نمونه تویوتا (قیمت‌ها به تومان)
  await db.insert(parts).values([
    {
      name: 'لنت ترمز جلو تویوتا کرولا',
      description: 'لنگه جلویی، مناسب مدل‌های 2018 تا 2022',
      price: 850000,
      stock: 25,
      partNumber: 'BRK-COR-F01',
      carModel: 'کرولا 2018-2022',
      categoryId: catId('ترمز'),
    },
    {
      name: 'لنت ترمز عقب تویوتا کمری',
      description: 'لنگه عقب، کیفیت اصلی (OEM)',
      price: 920000,
      stock: 18,
      partNumber: 'BRK-CAM-R01',
      carModel: 'کمری 2019-2023',
      categoryId: catId('ترمز'),
    },
    {
      name: 'دیسک ترمز جلو تویوتا یاریس',
      description: 'دیسک ترمز جلو، ضدزنگ',
      price: 1450000,
      stock: 12,
      partNumber: 'BRK-YAR-FD1',
      carModel: 'یاریس 2017-2021',
      categoryId: catId('ترمز'),
    },
    {
      name: 'فیلتر روغن موتور تویوتا کرولا',
      description: 'فیلتر روغن اصلی، تعویض هر ۵ هزار کیلومتر',
      price: 180000,
      stock: 60,
      partNumber: 'ENG-OIL-FL1',
      carModel: 'کرولا',
      categoryId: catId('موتور'),
    },
    {
      name: 'تسمه تایم تویوتا کمری ۲.۵',
      description: 'تسمه تایم با کیفیت بالا',
      price: 2100000,
      stock: 8,
      partNumber: 'ENG-TB-25',
      carModel: 'کمری 2.5',
      categoryId: catId('موتور'),
    },
    {
      name: 'کیسه هوا راننده تویوتا راو۴',
      description: 'ماژول کیسه هوا سمت راننده',
      price: 5800000,
      stock: 4,
      partNumber: 'ENG-AIR-D1',
      carModel: 'RAV4 2019-2023',
      categoryId: catId('موتور'),
    },
    {
      name: 'کمک فنر جلو تویوتا هیلوکس',
      description: 'کمک فنر جلو، مناسب شرایط جاده‌ای ایران',
      price: 3200000,
      stock: 10,
      partNumber: 'SUS-HIL-FS1',
      carModel: 'هیلوکس 2016-2022',
      categoryId: catId('تعلیق'),
    },
    {
      name: 'مثلث تعلیق تویوتا کرولا',
      description: 'بوش و مثلث تعلیق سمت چپ و راست',
      price: 1650000,
      stock: 14,
      partNumber: 'SUS-COR-ARM',
      carModel: 'کرولا 2014-2019',
      categoryId: catId('تعلیق'),
    },
    {
      name: 'باتری ۶۶ آمپر تویوتا',
      description: 'باتری ۶۶ آمپر ساعت، مناسب اکثر مدل‌ها',
      price: 3900000,
      stock: 9,
      partNumber: 'ELC-BAT-66',
      carModel: 'عمومی',
      categoryId: catId('برق'),
    },
    {
      name: 'دینام تویوتا کمری',
      description: 'دینام بازسازی‌شده با گارانتی',
      price: 6700000,
      stock: 3,
      partNumber: 'ELC-ALT-CAM',
      carModel: 'کمری 2.4',
      categoryId: catId('برق'),
    },
  ]);

  console.log('✅ دسته‌ها و قطعات نمونه ثبت شدند');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ورود ادمین:');
  console.log('  ایمیل: ' + adminEmail);
  console.log('  رمز:   admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ خطا در seed:', err);
  process.exit(1);
});
