// ===================================================================
// کامپوننت‌های وضعیت (بارگذاری، خطا، خالی) — استفاده در همه صفحات
// ===================================================================

import type { ReactNode } from 'react';
import styles from './States.module.css';

export function Loading({ text = 'در حال بارگذاری...' }: { text?: string }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.error} role="alert">
      <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          تلاش دوباره
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon = '📦',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
