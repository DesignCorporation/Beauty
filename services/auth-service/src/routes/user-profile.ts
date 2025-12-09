import express, { type Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@beauty-platform/database';
import { getAuthContext } from '../utils/get-auth-context';

const router: Router = express.Router();

const userProfileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  role: true,
  tenantId: true,
};

/**
 * GET /api/users/profile
 * Получение профиля текущего пользователя
 */
router.get('/profile', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    const userId = auth.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Профиль пользователя живет в глобальной auth БД (tenantId может быть null в multi-tenant сценариях),
    // поэтому нельзя навешивать tenant фильтр. Авторизация уже гарантирует, что userId принадлежит текущей сессии.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * PUT /api/users/profile
 * Обновление профиля текущего пользователя
 */
const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().nullable(),
  // 🔧 FIX: Убрана .url() валидация для поддержки относительных путей из Images API
  // Images API возвращает относительные пути вида "/api/images/uploads/..."
  avatar: z.string().min(1).max(500).optional().nullable(),
});

router.put('/profile', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    const userId = auth.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Валидация входных данных
    const validationResult = updateProfileSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const { firstName, lastName, phone, avatar } = validationResult.data;
    console.log('🔄 PUT /profile - incoming data:', { firstName, lastName, phone, avatar });

    // Обновляем только переданные поля
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    console.log('💾 PUT /profile - updateData:', updateData);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: userProfileSelect,
    });

    console.log('✅ PUT /profile - updatedUser:', { email: updatedUser.email, avatar: updatedUser.avatar });

    return res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
});

/**
 * PUT /api/users/password
 * Изменение пароля текущего пользователя
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(100),
});

router.put('/password', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    const userId = auth.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Валидация входных данных
    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Получаем текущего пользователя с паролем
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем текущий пароль
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordAutoGenerated: false
      },
    });

    return res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
