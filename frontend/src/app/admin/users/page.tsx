'use client';

// ===================================================================
// لیست کاربران (ادمین)
// -------------------------------------------------------------------
// همه کاربران ثبت‌نام‌شده را (بدون رمز عبور) نشان می‌دهد.
// ===================================================================

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { User } from '@/lib/types';
import s from '../shared.module.css';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<User[]>('/api/users')
      .then((data) =>
        // فیلدهای اضافه احتمالی را حذف می‌کنیم (مثل phone، createdAt)
        setUsers(data as User[]),
      )
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'خطا در دریافت کاربران'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">در حال بارگذاری...</p>;

  return (
    <div>
      <h1 className={s.title}>کاربران ({users.length.toLocaleString('fa-IR')})</h1>
      {error && <p className="text-danger">{error}</p>}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>نام</th>
              <th>ایمیل</th>
              <th>نقش</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td dir="ltr">{u.email}</td>
                <td>
                  {u.role === 'admin' ? (
                    <span className="badge badge-confirmed">مدیر</span>
                  ) : (
                    <span className="muted">کاربر</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
