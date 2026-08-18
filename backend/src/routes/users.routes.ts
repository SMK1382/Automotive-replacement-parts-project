// ===================================================================
// مسیرهای کاربران (فقط ادمین)
// -------------------------------------------------------------------
// GET /api/users -> لیست همه کاربران (بدون رمز عبور)
// ===================================================================

import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// لیست همه کاربران (فقط ادمین) - رمز عبور برنمی‌گردد
router.get(
  '/',
  verifyToken,
  requireRole('admin'),
  async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در دریافت کاربران' });
    }
  },
);

export default router;
