'use client';

// ===================================================================
// هدر سایت (سبک فروشگاه‌های آنلاین ایرانی)
// -------------------------------------------------------------------
// ۱) نوار بالایی: لینک‌های سریع + ورود/ثبت‌نام یا نام کاربر و خروج
// ۲) نوار اصلی: لوگو، جست‌وجو، علاقه‌مندی، سبد خرید و «پنل من»
// ۳) نوار دسته‌بندی: مگامنوی دسته‌ها و برندها
// داده‌های منو (دسته‌بندی/برند) از سرور به‌صورت prop دریافت می‌شود
// تا درخواست اضافه سمت کلاینت نداشته باشیم.
// ===================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import type { Brand, Category } from '@/lib/types';
import { isManager } from '@/lib/format';
import styles from './Header.module.css';

export default function Header({
  tree = [],
  brands = [],
}: {
  tree?: Category[];
  brands?: Brand[];
}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { count } = useCart();

  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'categories' | 'brands' | 'user' | null>(null);
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // بستن منوها با کلیک بیرون و کلید Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  // بستن کشوی موبایل هنگام تغییر مسیر
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [router]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  }

  const rootCategories = tree.filter((c) => c.children && c.children.length > 0);
  const flatCategories = tree.filter((c) => !c.children?.length);
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  return (
    <header className={styles.header}>
      {/* ================= ۱) نوار بالایی ================= */}
      <div className={styles.topbar}>
        <div className={`container ${styles.topbarInner}`}>
          <div className={styles.topLinks}>
            <Link href="/track">🚚 پیگیری سفارش</Link>
            <span className={styles.sep} aria-hidden="true">|</span>
            <Link href="/contact">☎️ تماس با ما</Link>
            <span className={styles.sep} aria-hidden="true">|</span>
            <Link href="/blog">📝 مجله فنی</Link>
          </div>

          {loading ? null : user ? (
            <div className={styles.topUser}>
              <span className={styles.welcome}>سلام، {user.firstName} 👋</span>
              <Link href={isManager(user.role) ? '/admin' : '/panel'} className={styles.topPanelLink}>
                پنل {isManager(user.role) ? 'مدیریت' : 'کاربری'}
              </Link>
              <button
                type="button"
                className={styles.topLogout}
                onClick={() => {
                  logout();
                  router.push('/');
                }}
              >
                خروج
              </button>
            </div>
          ) : (
            <div className={styles.topAuth}>
              <Link href="/login">ورود</Link>
              <span className={styles.sep} aria-hidden="true">|</span>
              <Link href="/register">ثبت‌نام</Link>
            </div>
          )}
        </div>
      </div>

      {/* ================= ۲) نوار اصلی ================= */}
      <div className={`container ${styles.bar}`}>
        <button
          type="button"
          className={styles.burger}
          aria-label="باز کردن منو"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>

        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon} aria-hidden="true">🚗</span>
          <span className={styles.logoText}>یدک<span>اکسپرت</span></span>
        </Link>

        <form className={styles.searchForm} onSubmit={submitSearch} role="search">
          <input
            type="search"
            className={styles.searchInput}
            placeholder="جست‌وجو در نام قطعه یا کد فنی..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جست‌وجوی محصولات"
          />
          <button type="submit" className={styles.searchBtn} aria-label="جست‌وجو">
            🔍
          </button>
        </form>

        <div className={styles.actions}>
          <Link href="/panel/wishlist" className={styles.actionBtn} aria-label="علاقه‌مندی‌ها" title="علاقه‌مندی‌ها">
            <span aria-hidden="true">❤️</span>
          </Link>

          <Link href="/cart" className={styles.actionBtn} aria-label={`سبد خرید (${count} قلم)`} title="سبد خرید">
            <span aria-hidden="true">🛒</span>
            {count > 0 && <span className={styles.badge}>{count.toLocaleString('fa-IR')}</span>}
          </Link>

          {/* دکمه دسترسی به پنل کاربر / ورود */}
          {loading ? (
            <span className={styles.userLoading}>...</span>
          ) : user ? (
            <div
              className={styles.userMenu}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'user' ? null : 'user');
              }}
            >
              <button type="button" className={styles.panelBtn}>
                <span aria-hidden="true">👤</span>
                <span className={styles.panelBtnText}>پنل من</span>
                <span className={styles.panelBtnName}>{fullName}</span>
                <span className={styles.caret} aria-hidden="true">▾</span>
              </button>
              {openMenu === 'user' && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHead}>
                    <strong>{fullName}</strong>
                    <small>{user.email}</small>
                  </div>
                  {isManager(user.role) ? (
                    <Link href="/admin" className={styles.dropItem}>🛠 پنل مدیریت</Link>
                  ) : null}
                  <Link href="/panel" className={styles.dropItem}>👤 حساب کاربری</Link>
                  <Link href="/panel/orders" className={styles.dropItem}>📦 سفارش‌های من</Link>
                  <Link href="/panel/addresses" className={styles.dropItem}>📍 آدرس‌های من</Link>
                  <Link href="/panel/wishlist" className={styles.dropItem}>❤️ علاقه‌مندی‌ها</Link>
                  <Link href="/track" className={styles.dropItem}>🚚 پیگیری سفارش</Link>
                  <button
                    type="button"
                    className={`${styles.dropItem} ${styles.dropDanger}`}
                    onClick={() => {
                      logout();
                      router.push('/');
                    }}
                  >
                    🚪 خروج از حساب
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className={styles.loginBtn}>
              <span aria-hidden="true">🔑</span>
              <span>ورود | ثبت‌نام</span>
            </Link>
          )}
        </div>
      </div>

      {/* جست‌وجوی موبایل */}
      <div className={`container ${styles.mobileSearch}`}>
        <form onSubmit={submitSearch} role="search">
          <input
            type="search"
            className={styles.searchInput}
            placeholder="جست‌وجوی قطعه یا کد فنی..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جست‌وجوی محصولات"
          />
          <button type="submit" className={styles.searchBtn} aria-label="جست‌وجو">🔍</button>
        </form>
      </div>

      {/* ================= ۳) نوار دسته‌بندی ================= */}
      <nav className={styles.navbar} ref={navRef} aria-label="منوی اصلی">
        <div className={`container ${styles.navInner}`}>
          <div className={styles.navItemWrap}>
            <button
              type="button"
              className={styles.navItem}
              aria-expanded={openMenu === 'categories'}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'categories' ? null : 'categories');
              }}
            >
              ☰ دسته‌بندی محصولات
            </button>
            {openMenu === 'categories' && (
              <div className={styles.mega}>
                <div className={styles.megaCols}>
                  {rootCategories.map((cat) => (
                    <div key={cat.id} className={styles.megaCol}>
                      <Link
                        href={`/products?category=${cat.slug}`}
                        className={styles.megaTitle}
                      >
                        {cat.iconEmoji} {cat.name}
                      </Link>
                      {(cat.children ?? []).map((child) => (
                        <Link
                          key={child.id}
                          href={`/products?category=${child.slug}`}
                          className={styles.megaLink}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                  {flatCategories.length > 0 && (
                    <div className={styles.megaCol}>
                      <span className={styles.megaTitle}>سایر دسته‌ها</span>
                      {flatCategories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/products?category=${cat.slug}`}
                          className={styles.megaLink}
                        >
                          {cat.iconEmoji} {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <Link href="/products" className={styles.megaFooter}>
                  مشاهده همه محصولات →
                </Link>
              </div>
            )}
          </div>

          <div className={styles.navItemWrap}>
            <button
              type="button"
              className={styles.navItem}
              aria-expanded={openMenu === 'brands'}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'brands' ? null : 'brands');
              }}
            >
              🚘 برندها و خودروها
            </button>
            {openMenu === 'brands' && (
              <div className={styles.mega}>
                <div className={styles.megaCols}>
                  {brands.map((brand) => (
                    <div key={brand.id} className={styles.megaCol}>
                      <Link href={`/products?brand=${brand.slug}`} className={styles.megaTitle}>
                        {brand.name}
                      </Link>
                      {(brand.models ?? []).map((model) => (
                        <Link
                          key={model.id}
                          href={`/products?model=${model.id}`}
                          className={styles.megaLink}
                        >
                          {model.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href="/products" className={styles.navLink}>همه محصولات</Link>
          <Link href="/products?onDiscount=1" className={styles.navHotLink}>🔥 تخفیف‌ها</Link>
          <Link href="/blog" className={styles.navLink}>مجله</Link>
          <Link href="/about" className={styles.navLink}>درباره ما</Link>
        </div>
      </nav>

      {/* ================= کشوی موبایل ================= */}
      {mobileOpen && (
        <div className={styles.drawer} role="dialog" aria-label="منوی موبایل">
          {/* ورود/پنل در موبایل */}
          {user ? (
            <div className={styles.drawerUser}>
              <strong>{fullName}</strong>
              <div className={styles.drawerUserLinks}>
                <Link href={isManager(user.role) ? '/admin' : '/panel'} className={styles.drawerBrandChip}>
                  پنل {isManager(user.role) ? 'مدیریت' : 'کاربری'}
                </Link>
                <Link href="/panel/orders" className={styles.drawerBrandChip}>سفارش‌ها</Link>
                <button
                  type="button"
                  className={styles.drawerBrandChip}
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                >
                  خروج
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.drawerAuth}>
              <Link href="/login" className="btn btn-primary">ورود</Link>
              <Link href="/register" className="btn btn-outline">ثبت‌نام</Link>
            </div>
          )}

          <nav className={styles.drawerNav} aria-label="منوی موبایل">
            <Link href="/products" className={styles.drawerLink}>همه محصولات</Link>
            <Link href="/products?onDiscount=1" className={styles.drawerLink}>🔥 تخفیف‌ها</Link>
            <Link href="/blog" className={styles.drawerLink}>مجله</Link>
            <Link href="/track" className={styles.drawerLink}>پیگیری سفارش</Link>
            <Link href="/about" className={styles.drawerLink}>درباره ما</Link>
            <Link href="/contact" className={styles.drawerLink}>تماس با ما</Link>
          </nav>

          <div className={styles.drawerSectionTitle}>دسته‌بندی‌ها</div>
          <div className={styles.drawerCats}>
            {tree.map((cat) => {
              const hasKids = (cat.children?.length ?? 0) > 0;
              return (
                <div key={cat.id}>
                  <div className={styles.drawerCatRow}>
                    <Link href={`/products?category=${cat.slug}`} className={styles.drawerCat}>
                      {cat.iconEmoji} {cat.name}
                    </Link>
                    {hasKids && (
                      <button
                        type="button"
                        className={`${styles.expandBtn} ${expandedCat === cat.id ? styles.expanded : ''}`}
                        aria-label={`زیردسته‌های ${cat.name}`}
                        onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                      >
                        ▾
                      </button>
                    )}
                  </div>
                  {hasKids && expandedCat === cat.id && (
                    <div className={styles.drawerSubcats}>
                      {cat.children!.map((child) => (
                        <Link
                          key={child.id}
                          href={`/products?category=${child.slug}`}
                          className={styles.drawerSubcat}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.drawerSectionTitle}>برندها</div>
          <div className={styles.drawerBrands}>
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/products?brand=${brand.slug}`}
                className={styles.drawerBrandChip}
              >
                {brand.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
