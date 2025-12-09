import express, { type Router, type Request, type Response } from 'express';
import { mfaManager } from '../mfa/MFAManager';
import { securityLogger, SecurityEventType } from '../security/SecurityLogger';
import { verifyAccessToken, extractTokenFromRequest, hashToken, generateTokenPair } from '../utils/jwt';
import { encryptTOTPSecret, generateBackupCodes, hashBackupCode } from '../utils/encryption';
import { generateDeviceContext } from '../utils/device';
import { tenantPrisma, prisma } from '@beauty-platform/database';
import { mfaVerifyLimiter } from '../middleware/rateLimiters';

const router: Router = express.Router();

// Middleware для проверки аутентификации (общий с auth-secure.ts)
const requireAuth = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      securityLogger.logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, req, {
        details: {
          endpoint: req.path,
          reason: 'no_token'
        }
      });
      
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Валидируем access токен
    let decoded;
    try {
      decoded = await verifyAccessToken(token);
    } catch (error) {
      securityLogger.logSecurityEvent(SecurityEventType.TOKEN_INVALID, req, {
        details: {
          endpoint: req.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Получаем пользователя из БД
    const user = await tenantPrisma(null).user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!user || !user.isActive) {
      securityLogger.logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, req, {
        details: {
          endpoint: req.path,
          reason: 'user_not_found_or_disabled',
          userId: decoded.userId
        }
      });
      
      res.status(401).json({
        success: false,
        error: 'User not found or disabled'
      });
      return;
    }

    // Добавляем пользователя в запрос
    (req as any).user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenant: (user as any).tenant
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
      details: {
        endpoint: req.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// Helper middleware
const sendError = (res: Response, status: number, message: string): Response => {
  return res.status(status).json({
    success: false,
    error: message
  });
};

// POST /mfa/setup/initiate - Инициация настройки MFA
router.post('/setup/initiate', 
  requireAuth,
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const user = (req as any).user;
      
      // 🔧 Проверяем, не настроен ли уже MFA (через БД, а не память!)
      if (await mfaManager.isMFARequiredDB(user.id)) {
        return sendError(res, 400, 'MFA is already enabled for this user');
      }
      
      const setup = await mfaManager.initiateMFASetup(user.id, user.email, req);
      
      return res.json({
        success: true,
        data: {
          qrCodeUrl: setup.qrCodeUrl,
          setupToken: setup.setupToken,
          backupCodes: setup.backupCodes,
          instructions: {
            step1: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
            step2: 'Enter the 6-digit code from your app to complete setup',
            step3: 'Save your backup codes in a secure location'
          }
        }
      });
      
    } catch (error) {
      securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
        userId: (req as any).user?.id,
        email: (req as any).user?.email,
        details: {
          action: 'mfa_setup_initiate_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      return sendError(res, 500, 'Failed to initiate MFA setup');
    }
  }
);

// POST /mfa/verify - Проверка MFA кода при логине
router.post('/verify',
  mfaVerifyLimiter,
  async (req: Request, res: Response) => {
    try {
      const { code, userId, email, trustDevice = false } = req.body;
      
      if (!code || !userId || !email) {
        return sendError(res, 400, 'Code, userId and email are required');
      }
      
      const result = await mfaManager.verifyMFA(userId, email, code, req, trustDevice);
      
      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
          data: {
            verified: true,
            usedBackupCode: result.usedBackupCode,
            requiresNewBackupCodes: result.requiresNewBackupCodes,
            riskScore: result.riskScore,
            verifiedAt: new Date()
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.message,
          data: {
            verified: false,
            riskScore: result.riskScore
          }
        });
      }
      
    } catch (error) {
      securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
        details: {
          action: 'mfa_verify_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      return sendError(res, 500, 'MFA verification failed');
    }
  }
);

// POST /mfa/setup/complete - Завершение настройки MFA
router.post('/setup/complete',
  requireAuth,
  async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const user = (req as any).user;
      const { code, setupToken } = req.body;
      
      if (!code || !setupToken) {
        return sendError(res, 400, 'Code and setupToken are required');
      }
      
      const result = await mfaManager.completeMFASetup(user.id, user.email, code, setupToken, req);
      
      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
          data: {
            backupCodes: result.backupCodes
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.message
        });
      }
      
    } catch (error) {
      securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
        userId: (req as any).user?.id,
        email: (req as any).user?.email,
        details: {
          action: 'mfa_setup_complete_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      return sendError(res, 500, 'MFA setup completion failed');
    }
  }
);

// GET /mfa/status - Статус MFA для пользователя
router.get('/status',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      const status = mfaManager.getUserMFAStatus(user.id);
      const isRequired = mfaManager.isMFARequired(user.id);
      const isTrusted = mfaManager.isTrustedDevice(req);
      
      return res.json({
        success: true,
        data: {
          enabled: isRequired,
          required: isRequired,
          trustedDevice: isTrusted,
          status: status || {
            enabled: false,
            backupCodesCount: 0,
            trustedDevicesCount: 0
          }
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get MFA status'
      });
    }
    return undefined;
  }
);

// GET /mfa/stats - Статистика MFA и Security (только для админов)
router.get('/stats',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Проверяем права доступа (только админы)
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'SALON_OWNER') {
        securityLogger.logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, req, {
          userId: user.id,
          email: user.email,
          details: {
            endpoint: req.path,
            requiredRole: 'SUPER_ADMIN or SALON_OWNER',
            userRole: user.role
          }
        });
        
        return sendError(res, 403, 'Insufficient permissions');
      }
      
      const mfaStats = mfaManager.getMFAStats();
      const securityStats = securityLogger.getSecurityStats();
      const recentEvents = securityLogger.getRecentEvents(20);
      const blockedIPs = securityLogger.getBruteForceStatus();
      
      return res.json({
        success: true,
        data: {
          mfa: mfaStats,
          security: securityStats,
          recentEvents,
          blockedIPs: blockedIPs.filter(b => b.blocked),
          suspiciousIPs: securityLogger.getSuspiciousIPs(),
          generatedAt: new Date()
        }
      });
      
    } catch (error) {
      return sendError(res, 500, 'Failed to get MFA statistics');
    }
  }
);

// POST /mfa/test-db-update - ДИАГНОСТИКА: проверка обновления БД (ВРЕМЕННЫЙ ENDPOINT!)
router.post('/test-db-update',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      console.log('🔬 ДИАГНОСТИКА: Попытка обновления mfaEnabled для пользователя', user.id);
      
      // Попытка прямого обновления БД
      const updateResult = await tenantPrisma(null).user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true,
          mfaSecret: 'test_encrypted_secret',
          mfaBackupCodes: '["test1","test2"]'
        }
      });
      
      console.log('✅ Обновление БД успешно:', updateResult.mfaEnabled);
      
      // Проверим что действительно сохранилось
      const checkUser = await tenantPrisma(null).user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, mfaEnabled: true, mfaSecret: true }
      });
      
      console.log('🔍 Проверка сохранения:', checkUser);
      
      return res.json({
        success: true,
        message: 'Test DB update completed',
        data: {
          updated: updateResult.mfaEnabled,
          verified: checkUser?.mfaEnabled,
          hasSecret: !!checkUser?.mfaSecret
        }
      });
      
    } catch (error) {
      console.error('❌ ДИАГНОСТИКА: Ошибка обновления БД:', error);
      return res.status(500).json({
        success: false,
        error: 'Test DB update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// POST /mfa/fix-admin-mfa - ДИАГНОСТИКА: Исправить MFA для админа с правильным шифрованием (ВРЕМЕННО БЕЗ AUTH)
router.post('/fix-admin-mfa',
  async (_req: Request, res: Response) => {
    try {
      console.log('🔧 ДИАГНОСТИКА: Создаем правильные MFA данные для админа (TEMPORARY BYPASS)');
      console.log('🔍 ENV CHECK:', {
        hasMasterKey: !!process.env.MFA_MASTER_KEY,
        masterKeyLength: process.env.MFA_MASTER_KEY?.length || 0
      });
      
      // Генерируем тестовый TOTP секрет (base32)
      const testSecret = 'JBSWY3DPEHPK3PXP'; // Тестовый секрет для Google Authenticator
      
      // Правильно шифруем секрет
      const encryptedSecret = encryptTOTPSecret(testSecret);
      
      // Генерируем backup коды и хэшируем их
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = [];
      for (const code of backupCodes) {
        const hashedCode = await hashBackupCode(code);
        hashedBackupCodes.push(hashedCode);
      }
      
      // Обновляем админа с правильными зашифрованными данными
      const updateResult = await tenantPrisma(null).user.update({
        where: { email: 'admin@beauty-platform.com' },
        data: {
          mfaEnabled: true,
          mfaSecret: JSON.stringify(encryptedSecret), // Правильный формат
          mfaBackupCodes: JSON.stringify(hashedBackupCodes) // Хэшированные коды
        }
      });
      
      console.log('✅ MFA данные созданы правильно:', {
        mfaEnabled: updateResult.mfaEnabled,
        hasEncryptedSecret: !!updateResult.mfaSecret,
        hasBackupCodes: !!updateResult.mfaBackupCodes
      });
      
      // Очищаем кэш MFAManager для админа
      mfaManager.clearUserCache(updateResult.id);
      
      return res.json({
        success: true,
        message: 'Admin MFA data fixed with proper encryption',
        data: {
          testSecret: testSecret, // ДЛЯ ТЕСТИРОВАНИЯ: секрет для Google Authenticator
          backupCodes: backupCodes, // ДЛЯ ТЕСТИРОВАНИЯ: незашифрованные коды
          mfaEnabled: updateResult.mfaEnabled
        }
      });
      
    } catch (error) {
      console.error('❌ ДИАГНОСТИКА: Ошибка исправления MFA:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fix admin MFA',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// POST /mfa/complete-login - Завершение логина через MFA (КРИТИЧЕСКИЙ ENDPOINT!)
router.post('/complete-login',
  async (req: Request, res: Response) => {
    try {
      const { code, userId, email, trustDevice = false } = req.body;
      
      if (!code || !userId || !email) {
        console.log('🚨 MFA Complete Login: Missing parameters:', { code: !!code, userId: !!userId, email: !!email });
        return sendError(res, 400, 'Code, userId and email are required');
      }
      
      console.log('🔐 MFA Complete Login Request:', {
        userId: userId.substring(0, 8) + '...',
        email,
        codeLength: code.length,
        codeType: /^\d{6}$/.test(code) ? 'TOTP' : 'BACKUP',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent')?.substring(0, 50) + '...'
      });
      
      // 🛡️ ПРОВЕРЯЕМ MFA КОД
      const mfaResult = await mfaManager.verifyMFA(userId, email, code, req, trustDevice);
      
      if (!mfaResult.success) {
        console.log('❌ MFA Complete Login Failed:', {
          userId: userId.substring(0, 8) + '...',
          email,
          reason: mfaResult.message,
          riskScore: mfaResult.riskScore
        });
        
        securityLogger.logMFAAttempt(req, email, false, 'totp', {
          step: 'complete_login_failed',
          reason: mfaResult.message,
          riskScore: mfaResult.riskScore
        });
        
        return res.status(400).json({
          success: false,
          error: mfaResult.message,
          code: 'MFA_VERIFICATION_FAILED',
          data: {
            riskScore: mfaResult.riskScore
          }
        });
      }
      
      console.log('✅ MFA Complete Login Success:', {
        userId: userId.substring(0, 8) + '...',
        email,
        method: mfaResult.usedBackupCode ? 'BACKUP_CODE' : 'TOTP'
      });
      
      // 🔐 MFA УСПЕШНО ПРОВЕРЕН - ВЫДАЕМ ПОЛНЫЕ JWT ТОКЕНЫ
      
      // Получаем пользователя из БД для токенов
      const user = await tenantPrisma(null).user.findUnique({
        where: { id: userId },
        include: {
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              isActive: true
            }
          }
        }
      });
      
      if (!user || !user.isActive) {
        securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
          userId,
          email,
          details: {
            action: 'mfa_complete_login_user_not_found',
            userId
          }
        });
        
        return sendError(res, 401, 'User not found or inactive');
      }
      
      // Проверяем статус tenant
      if ((user as any).tenant && (!((user as any).tenant).isActive || ((user as any).tenant).status !== 'ACTIVE')) {
        return sendError(res, 401, 'Salon account is not active');
      }
      
      // 🎯 ГЕНЕРИРУЕМ ПОЛНЫЕ JWT ТОКЕНЫ
      // generateTokenPair imported from ../utils/jwt
      
      // Получаем permissions для токена
      let permissions: string[] = [];
      try {
        const roleRecord = await prisma.role.findUnique({
          where: { name: user.role },
          include: {
            permissions: {
              select: { name: true }
            }
          }
        });
        if (roleRecord) {
          permissions = roleRecord.permissions.map(p => p.name).sort();
        }
      } catch (e) {
        console.warn('Failed to load permissions in MFA complete:', e);
      }

      // 📱 UPSERT DEVICE
      let device;
      try {
        const deviceContext = generateDeviceContext(req);
        
        device = await prisma.device.upsert({
          where: {
            userId_deviceId: {
              userId: user.id,
              deviceId: deviceContext.deviceId
            }
          },
          update: {
            lastUsedAt: new Date(),
            userAgent: deviceContext.userAgent || null,
            ipAddress: deviceContext.ipAddress || null,
            isActive: true
          },
          create: {
            userId: user.id,
            deviceId: deviceContext.deviceId,
            userAgent: deviceContext.userAgent || null,
            ipAddress: deviceContext.ipAddress || null,
            deviceName: deviceContext.deviceName || 'Unknown device',
            isActive: true,
            lastUsedAt: new Date()
          }
        });
      } catch (error) {
        console.error('🚨 Device upsert failed in MFA complete:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Device registration failed', 
          details: error instanceof Error ? error.message : String(error) 
        });
      }

      const tokens = await generateTokenPair({
        userId: user.id,
        tenantId: user.tenantId as string | undefined,
        role: user.role,
        email: user.email,
        permissions,
        deviceId: device.deviceId,
        tenantRole: user.role === 'SUPER_ADMIN' ? 'OWNER' : undefined // Basic mapping
      });
      
      // Сохраняем refresh token в БД
      // Используем глобальный prisma client для моделей, которые не tenant-specific
      // (Device и RefreshToken находятся на глобальном уровне)
      try {
        await prisma.refreshToken.create({
          data: {
            token: hashToken(tokens.refreshToken), // ✅ Hashed token
            userId: user.id,
            deviceId: device.id, // ✅ Real device UUID
            isUsed: false,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней
          }
        });
      } catch (error) {
        console.error('🚨 Refresh token save failed in MFA complete:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Token storage failed', 
          details: error instanceof Error ? error.message : String(error) 
        });
      }

      // 🍪 УСТАНАВЛИВАЕМ HTTPONLY COOKIES (как в auth-secure.ts)
      // 🔧 FIX: Changed sameSite from 'strict' to 'lax' and added domain
      // for cross-subdomain support (dev-salon → dev-api)
      const COOKIE_CONFIG = {
        httpOnly: true,
        secure: true,  // Always true for HTTPS (even in dev)
        sameSite: 'lax' as const,  // Changed from 'strict' to support cross-subdomain
        domain: '.beauty.designcorp.eu',  // Cross-subdomain cookie sharing
        path: '/'
      };

      res.cookie('beauty_access_token', tokens.accessToken, {
        ...COOKIE_CONFIG,
        maxAge: 12 * 60 * 60 * 1000 // 12 часов
      });

      res.cookie('beauty_refresh_token', tokens.refreshToken, {
        ...COOKIE_CONFIG,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
      });
      
      // 🔐 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Устанавливаем MFA verification cookie
      // Это cookie необходимо для прохождения requireMFAVerified middleware
      res.cookie('beauty_mfa_verified', 'true', {
        ...COOKIE_CONFIG,
        maxAge: 24 * 60 * 60 * 1000 // 24 часа (дольше чем access token)
      });
      
      // Логируем успешный MFA login
      securityLogger.logMFAAttempt(req, email, true, mfaResult.usedBackupCode ? 'backup_code' : 'totp', {
        step: 'complete_login_success',
        userId: user.id,
        role: user.role,
        riskScore: mfaResult.riskScore
      });
      
      // Audit log
      await tenantPrisma(null).auditLog.create({
        data: {
          tenantId: user.tenantId || null,
          action: 'LOGIN',
          entityType: 'Auth',
          entityId: user.id,
          userId: user.id,
          userRole: user.role || null,
          oldValues: null,
          newValues: { mfaVerified: true, usedBackupCode: mfaResult.usedBackupCode },
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent') || 'Unknown'
        }
      });
      
      // Возвращаем информацию о пользователе (БЕЗ токенов в JSON!)
      return res.json({
        success: true,
        message: 'MFA login completed successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId as string | undefined,
          tenantSlug: (user as any).tenant?.slug,
          tenantName: (user as any).tenant?.name
        },
        mfaData: {
          verified: true,
          usedBackupCode: mfaResult.usedBackupCode,
          requiresNewBackupCodes: mfaResult.requiresNewBackupCodes,
          trustedDevice: trustDevice,
          riskScore: mfaResult.riskScore
        }
      });
      
    } catch (error) {
      console.error('MFA complete login error:', error);
      securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
        details: {
          action: 'mfa_complete_login_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      return sendError(res, 500, 'MFA login completion failed');
    }
  }
);

export default router;
