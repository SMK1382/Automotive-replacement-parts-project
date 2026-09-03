'use client';

// ===================================================================
// مدیریت پیام‌های تماس با ما
// ===================================================================

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { ContactMessage } from '@/lib/types';
import { EmptyState, ErrorBox, Loading } from '@/components/States';
import styles from '../shared.module.css';

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setMessages(await apiGet<ContactMessage[]>('/api/contact'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت پیام‌ها');
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleRead(m: ContactMessage) {
    try {
      await apiPatch(`/api/contact/${m.id}`, { isRead: !m.isRead });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر وضعیت');
    }
  }

  async function remove(id: number) {
    if (!window.confirm('این پیام حذف شود؟')) return;
    try {
      await apiDelete(`/api/contact/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف پیام');
    }
  }

  if (messages === null) return <Loading />;

  const filtered = onlyUnread ? messages.filter((m) => !m.isRead) : messages;
  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>
          پیام‌های تماس
          {unreadCount > 0 && (
            <span className="badge badge-pending" style={{ marginRight: 8 }}>
              {unreadCount.toLocaleString('fa-IR')} خوانده‌نشده
            </span>
          )}
        </h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem' }}>
          <input
            type="checkbox"
            style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
            checked={onlyUnread}
            onChange={(e) => setOnlyUnread(e.target.checked)}
          />
          فقط خوانده‌نشده‌ها
        </label>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      {filtered.length === 0 ? (
        <EmptyState icon="✉️" title="پیامی موجود نیست" />
      ) : (
        <div className={styles.reviewList}>
          {filtered.map((m) => (
            <article
              key={m.id}
              className={styles.reviewCard}
              style={m.isRead ? undefined : { borderColor: 'var(--color-accent)' }}
            >
              <header className={styles.reviewHead}>
                <strong>{m.name}</strong>
                <span dir="ltr" className={styles.subText}>{m.phone}</span>
                <span className={`badge ${m.isRead ? 'badge-delivered' : 'badge-pending'}`}>
                  {m.isRead ? 'خوانده‌شده' : 'جدید'}
                </span>
                <span className={styles.subText}>{formatDateTime(m.createdAt)}</span>
              </header>
              <p className={styles.reviewText}>
                <strong>موضوع:</strong> {m.subject}
              </p>
              <p className={styles.reviewText}>{m.message}</p>
              <div className={styles.rowActions}>
                <button type="button" className={styles.editBtn} onClick={() => toggleRead(m)}>
                  {m.isRead ? 'علامت‌گذاری به‌عنوان خوانده‌نشده' : 'خوانده شد'}
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => remove(m.id)}
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
