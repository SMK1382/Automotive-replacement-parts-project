// ===================================================================
// نمایش امتیاز به‌صورت ستاره (فقط خواندنی) + نسخه تعاملی برای فرم
// ===================================================================

import styles from './RatingStars.module.css';

interface StarsProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingStars({ value, size = 'sm' }: StarsProps) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span
      className={`${styles.stars} ${styles[size]}`}
      aria-label={`امتیاز ${value} از ۵`}
      dir="ltr"
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const cls =
          rounded >= i ? styles.full : rounded >= i - 0.5 ? styles.half : '';
        return (
          <span key={i} className={`${styles.star} ${cls}`} aria-hidden="true">
            ★
          </span>
        );
      })}
    </span>
  );
}

// انتخاب امتیاز در فرم ثبت نظر
export function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.input} role="radiogroup" aria-label="انتخاب امتیاز">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          className={`${styles.starBtn} ${i <= value ? styles.full : ''}`}
          onClick={() => onChange(i)}
          title={`${i} از ۵`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
