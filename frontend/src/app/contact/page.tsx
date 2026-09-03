'use client';

// ===================================================================
// تماس با ما: اطلاعات تماس + فرم پیام (با نرخ‌محدود سرور)
// ===================================================================

import { useState } from 'react';
import { apiPost } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import styles from './contact.module.css';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', subject: '', message: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');

    const errors: Record<string, string> = {};
    if (form.name.trim().length < 2) errors.name = 'نام خود را وارد کنید';
    if (!/^09\d{9}$/.test(form.phone.trim()))
      errors.phone = 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد';
    if (form.subject.trim().length < 3) errors.subject = 'موضوع پیام را وارد کنید';
    if (form.message.trim().length < 10)
      errors.message = 'متن پیام باید حداقل ۱۰ حرف باشد';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await apiPost('/api/contact', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setMsg('پیام شما ثبت شد؛ کارشناسان ما در اسرع وقت با شما تماس می‌گیرند.');
      setForm({ name: '', phone: '', subject: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت پیام');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'خانه', href: '/' }, { label: 'تماس با ما' }]} />

      <h1 className={styles.title}>تماس با ما</h1>

      <div className={styles.layout}>
        {/* اطلاعات تماس */}
        <aside className={styles.info}>
          <div className={styles.infoCard}>
            <h3>📞 تلفن پشتیبانی</h3>
            <p dir="ltr">۰۲۱-۱۲۳۴۵۶۷۸</p>
            <small>شنبه تا پنجشنبه، ۹ صبح تا ۶ عصر</small>
          </div>
          <div className={styles.infoCard}>
            <h3>📍 آدرس فروشگاه</h3>
            <p>تهران، خیابان آزادی، مجتمع قطعات خودرو، پلاک ۱۲</p>
          </div>
          <div className={styles.infoCard}>
            <h3>✉️ ایمیل</h3>
            <p dir="ltr">support@yadakpart.ir</p>
          </div>
          <div className={styles.infoCard}>
            <h3>🚚 ساعات ارسال</h3>
            <p>سفارش‌های تا ساعت ۱۳ همان روز ارسال می‌شوند.</p>
          </div>
        </aside>

        {/* فرم پیام */}
        <form className={styles.formCard} onSubmit={submit} noValidate>
          <h2>ارسال پیام</h2>
          {msg && <p className="formSuccess">{msg}</p>}
          {error && <p className="formError">{error}</p>}

          <div className={styles.grid2}>
            <div className="field">
              <label className="label" htmlFor="c-name">
                نام و نام خانوادگی <span className="req">*</span>
              </label>
              <input
                id="c-name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {fieldErrors.name && <span className="fieldError">{fieldErrors.name}</span>}
            </div>

            <div className="field">
              <label className="label" htmlFor="c-phone">
                شماره موبایل <span className="req">*</span>
              </label>
              <input
                id="c-phone"
                className="input"
                dir="ltr"
                inputMode="numeric"
                placeholder="09123456789"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              {fieldErrors.phone && <span className="fieldError">{fieldErrors.phone}</span>}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="c-subject">
              موضوع <span className="req">*</span>
            </label>
            <input
              id="c-subject"
              className="input"
              placeholder="مثلاً: استعلام قطعه برای تویوتا کرولا"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            {fieldErrors.subject && (
              <span className="fieldError">{fieldErrors.subject}</span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="c-message">
              متن پیام <span className="req">*</span>
            </label>
            <textarea
              id="c-message"
              className="textarea"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            {fieldErrors.message && (
              <span className="fieldError">{fieldErrors.message}</span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-large" disabled={submitting}>
            {submitting ? 'در حال ارسال...' : 'ارسال پیام'}
          </button>
        </form>
      </div>
    </div>
  );
}
