import { Request } from 'express';
import * as crypto from 'crypto';
// import { monitoringEvents } from '../../../api-gateway/src/routes/monitoring';

// Типы security событий
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_SUCCESS = 'MFA_SUCCESS',
  MFA_FAILED = 'MFA_FAILED',
  MFA_SETUP = 'MFA_SETUP',
  MFA_DISABLED = 'MFA_DISABLED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REUSED = 'TOKEN_REUSED',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  DATA_ACCESS_VIOLATION = 'DATA_ACCESS_VIOLATION'
}

export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  level: SecurityLevel;
  service: string;
  
  // User information
  userId?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  
  // Request information
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  
  // Location information
  country?: string;
  city?: string;
  timezone?: string;
  
  // Event details
  message: string;
  details: Record<string, any>;
  
  // Risk assessment
  riskScore: number; // 0-100
  
  // Context
  sessionId?: string;
  correlationId?: string;
  
  // Resolution
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface BruteForceDetection {
  ip: string;
  attempts: number;
  firstAttempt: Date;
  lastAttempt: Date;
  blocked: boolean;
  blockedUntil?: Date;
}

export class SecurityLogger {
  private events: SecurityEvent[] = [];
  private bruteForceMap = new Map<string, BruteForceDetection>();
  private suspiciousIPs = new Set<string>();
  
  // Конфигурация
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 минут
  private readonly BRUTE_FORCE_WINDOW = 10 * 60 * 1000; // 10 минут
  private readonly MAX_EVENTS = 10000; // Максимум событий в памяти

  constructor() {
    // Очистка старых записей каждые 5 минут
    setInterval(() => {
      this.cleanupOldEvents();
      this.cleanupBruteForceData();
    }, 5 * 60 * 1000);
  }

  // Основной метод логирования
  logSecurityEvent(
    type: SecurityEventType,
    req: Request,
    details: Partial<SecurityEvent> = {}
  ): SecurityEvent {
    const { details: customDetails, ...restDetails } = details;
    const baseDetails = {
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      query: req.query,
      ...(customDetails ?? {})
    };
    
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      level: this.calculateSecurityLevel(type),
      service: 'auth-service',
      ip: this.extractClientIP(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      endpoint: req.path,
      method: req.method,
      message: this.generateMessage(type, details),
      details: baseDetails,
      riskScore: this.calculateRiskScore(type, req, details),
      correlationId: req.get('x-correlation-id') || this.generateCorrelationId()
    };
    
    const assignIfDefined = <K extends keyof SecurityEvent>(key: K, value: SecurityEvent[K] | undefined) => {
      if (value !== undefined) {
        event[key] = value;
      }
    };
    
    const requestUser = (req as any).user as { id?: string; email?: string; role?: string; tenantId?: string } | undefined;
    assignIfDefined('userId', requestUser?.id);
    assignIfDefined('email', requestUser?.email);
    assignIfDefined('role', requestUser?.role);
    assignIfDefined('tenantId', requestUser?.tenantId);
    
    assignIfDefined('email', restDetails.email);
    assignIfDefined('userId', restDetails.userId);
    assignIfDefined('role', restDetails.role);
    assignIfDefined('tenantId', restDetails.tenantId);
    assignIfDefined('sessionId', restDetails.sessionId);
    assignIfDefined('resolved', restDetails.resolved);
    assignIfDefined('resolvedBy', restDetails.resolvedBy);
    assignIfDefined('resolvedAt', restDetails.resolvedAt);
    assignIfDefined('resolution', restDetails.resolution);
    
    assignIfDefined('country', this.detectCountry(req));
    assignIfDefined('timezone', req.get('timezone') || undefined);
    
    assignIfDefined('city', restDetails.city);
    assignIfDefined('riskScore', restDetails.riskScore);
    assignIfDefined('level', restDetails.level);
    assignIfDefined('service', restDetails.service);
    assignIfDefined('type', restDetails.type);
    assignIfDefined('timestamp', restDetails.timestamp);
    assignIfDefined('correlationId', restDetails.correlationId);
    
    const handledKeys = new Set<keyof SecurityEvent>([
      'email',
      'userId',
      'role',
      'tenantId',
      'sessionId',
      'resolved',
      'resolvedBy',
      'resolvedAt',
      'resolution',
      'country',
      'timezone',
      'city',
      'riskScore',
      'level',
      'service',
      'type',
      'timestamp',
      'correlationId'
    ]);
    
    for (const key of Object.keys(restDetails) as (keyof SecurityEvent)[]) {
      if (key === 'details' || handledKeys.has(key)) {
        continue;
      }
      assignIfDefined(key, restDetails[key]);
    }

    // Сохраняем событие
    this.events.push(event);
    
    // Ограничиваем размер массива
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Обработка специфических событий
    this.handleSpecialEvents(event);

    // Отправляем в мониторинг
    this.sendToMonitoring(event);

    // Логируем в консоль для дебага
    this.logToConsole(event);

    return event;
  }

  // Специфические методы для разных типов событий
  logLoginAttempt(req: Request, email: string, success: boolean, details: any = {}) {
    const type = success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED;
    
    return this.logSecurityEvent(type, req, {
      email,
      details: {
        success,
        method: 'password',
        ...details
      }
    });
  }

  logMFAAttempt(req: Request, email: string, success: boolean, method: string, details: any = {}) {
    const type = success ? SecurityEventType.MFA_SUCCESS : SecurityEventType.MFA_FAILED;
    
    const event = this.logSecurityEvent(type, req, {
      email,
      details: {
        success,
        method,
        ...details
      }
    });

    // Brute force detection for MFA
    if (!success) {
      this.trackBruteForce(this.extractClientIP(req), email);
    }

    return event;
  }

  logSuspiciousActivity(req: Request, reason: string, details: any = {}) {
    return this.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, req, {
      message: `Suspicious activity detected: ${reason}`,
      details: {
        reason,
        ...details
      }
    });
  }

  logUnauthorizedAccess(req: Request, resource: string, requiredRole: string, details: any = {}) {
    return this.logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, req, {
      details: {
        resource,
        requiredRole,
        ...details
      }
    });
  }

  // Brute force detection
  private trackBruteForce(ip: string, email?: string): boolean {
    const now = new Date();
    const existing = this.bruteForceMap.get(ip);

    if (existing) {
      // Проверяем, не в блокировке ли уже
      if (existing.blocked && existing.blockedUntil && existing.blockedUntil > now) {
        return true; // Все еще заблокирован
      }

      // Увеличиваем счетчик, если в пределах окна
      if (now.getTime() - existing.firstAttempt.getTime() < this.BRUTE_FORCE_WINDOW) {
        existing.attempts++;
        existing.lastAttempt = now;

        // Блокируем при превышении лимита
        if (existing.attempts >= this.MAX_LOGIN_ATTEMPTS) {
          existing.blocked = true;
          existing.blockedUntil = new Date(now.getTime() + this.LOCKOUT_DURATION);
          
          // Логируем блокировку
          this.logSecurityEvent(SecurityEventType.BRUTE_FORCE_DETECTED, {} as Request, {
            ip,
            details: {
              attempts: existing.attempts,
              windowStart: existing.firstAttempt,
              blockedUntil: existing.blockedUntil
            },
            ...(email ? { email } : {})
          });

          this.suspiciousIPs.add(ip);
          return true;
        }
      } else {
        // Сбрасываем счетчик если вышли из окна
        existing.attempts = 1;
        existing.firstAttempt = now;
        existing.lastAttempt = now;
        existing.blocked = false;
        delete existing.blockedUntil;
      }
    } else {
      // Первая попытка
      this.bruteForceMap.set(ip, {
        ip,
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      });
    }

    return false;
  }

  // Проверка блокировки IP
  isIPBlocked(ip: string): boolean {
    const bruteForce = this.bruteForceMap.get(ip);
    if (!bruteForce || !bruteForce.blocked) return false;

    // Проверяем, не истекла ли блокировка
    if (bruteForce.blockedUntil && bruteForce.blockedUntil <= new Date()) {
      bruteForce.blocked = false;
      delete bruteForce.blockedUntil;
      this.suspiciousIPs.delete(ip);
      return false;
    }

    return true;
  }

  // Вспомогательные методы
  private generateEventId(): string {
    return `sec_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateCorrelationId(): string {
    return `corr_${crypto.randomBytes(16).toString('hex')}`;
  }

  private extractClientIP(req: Request): string {
    const forwarded = req.get('x-forwarded-for');
    if (forwarded) {
      const [firstHop] = forwarded.split(',');
      return (firstHop ?? forwarded).trim();
    }
    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  }

  // Session ID extraction from x-session-id header (optional feature, currently not used in logs)

  private detectCountry(req: Request): string | undefined {
    // TODO: Интеграция с MaxMind GeoIP или CloudFlare headers
    const cfCountry = req.get('cf-ipcountry');
    if (cfCountry) return cfCountry;
    
    // Простая детекция по timezone
    const timezone = req.get('timezone');
    if (timezone?.includes('Europe/Warsaw')) return 'PL';
    if (timezone?.includes('Europe/Kiev')) return 'UA';
    if (timezone?.includes('America/New_York')) return 'US';
    
    return 'Unknown';
  }

  private calculateSecurityLevel(type: SecurityEventType): SecurityLevel {
    const criticalEvents = [
      SecurityEventType.BRUTE_FORCE_DETECTED,
      SecurityEventType.PRIVILEGE_ESCALATION,
      SecurityEventType.DATA_ACCESS_VIOLATION
    ];

    const highEvents = [
      SecurityEventType.ACCOUNT_LOCKED,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.UNAUTHORIZED_ACCESS
    ];

    const mediumEvents = [
      SecurityEventType.LOGIN_FAILED,
      SecurityEventType.MFA_FAILED,
      SecurityEventType.RATE_LIMIT_EXCEEDED
    ];

    if (criticalEvents.includes(type)) return SecurityLevel.CRITICAL;
    if (highEvents.includes(type)) return SecurityLevel.HIGH;
    if (mediumEvents.includes(type)) return SecurityLevel.MEDIUM;
    return SecurityLevel.LOW;
  }

  private calculateRiskScore(type: SecurityEventType, req: Request, _details: any): number {
    let score = 0;

    // Базовый score по типу события
    const eventScores: Partial<Record<SecurityEventType, number>> = {
      [SecurityEventType.LOGIN_FAILED]: 20,
      [SecurityEventType.MFA_FAILED]: 30,
      [SecurityEventType.BRUTE_FORCE_DETECTED]: 90,
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: 60,
      [SecurityEventType.UNAUTHORIZED_ACCESS]: 70,
      [SecurityEventType.LOGIN_SUCCESS]: 5,
      [SecurityEventType.MFA_SUCCESS]: 5
    };

    score += eventScores[type] ?? 10;

    // Модификаторы риска
    const ip = this.extractClientIP(req);
    
    // Подозрительный IP
    if (this.suspiciousIPs.has(ip)) score += 25;

    // Необычный User-Agent
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('bot') || userAgent.includes('curl') || userAgent.includes('python')) {
      score += 15;
    }

    // Отсутствующие стандартные заголовки
    if (!req.get('Accept-Language')) score += 10;
    if (!req.get('Accept-Encoding')) score += 10;

    // Подозрительные заголовки
    if (req.get('X-Real-IP') && req.get('X-Forwarded-For')) score += 20;

    return Math.min(score, 100); // Максимум 100
  }

  private generateMessage(type: SecurityEventType, _details: any): string {
    const messages: Partial<Record<SecurityEventType, string>> = {
      [SecurityEventType.LOGIN_SUCCESS]: 'User successfully logged in',
      [SecurityEventType.LOGIN_FAILED]: 'Failed login attempt',
      [SecurityEventType.MFA_SUCCESS]: 'MFA verification successful',
      [SecurityEventType.MFA_FAILED]: 'MFA verification failed',
      [SecurityEventType.BRUTE_FORCE_DETECTED]: 'Brute force attack detected',
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: 'Suspicious activity detected',
      [SecurityEventType.UNAUTHORIZED_ACCESS]: 'Unauthorized access attempt'
    };

    return messages[type] ?? `Security event: ${type}`;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Удаляем чувствительные заголовки
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    
    const sanitized = { ...body };
    
    // Удаляем чувствительные поля
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.mfaCode;
    
    return sanitized;
  }

  private handleSpecialEvents(event: SecurityEvent): void {
    // Автоматические действия на основе событий
    
    if (event.type === SecurityEventType.BRUTE_FORCE_DETECTED) {
      // Автоматическая блокировка уже обработана в trackBruteForce
      console.log(`🚨 BRUTE FORCE DETECTED from ${event.ip} - IP blocked`);
    }

    if (event.riskScore >= 80) {
      console.log(`⚠️ HIGH RISK EVENT detected: ${event.type} (score: ${event.riskScore})`);
    }
  }

  private sendToMonitoring(event: SecurityEvent): void {
    try {
      // TODO: Интеграция с системой мониторинга
      // Отправляем событие в систему мониторинга
      console.log(`📊 [MONITORING] Security event: ${event.type}`);
    } catch (error) {
      // Ignore monitoring errors to avoid breaking auth flow
    }
  }

  private logToConsole(event: SecurityEvent): void {
    const level = event.level;
    const emoji = {
      [SecurityLevel.LOW]: '🔵',
      [SecurityLevel.MEDIUM]: '🟡', 
      [SecurityLevel.HIGH]: '🟠',
      [SecurityLevel.CRITICAL]: '🔴'
    }[level];

    console.log(`${emoji} [SECURITY] ${event.type}: ${event.message}`);
    console.log(`   User: ${event.email || 'Unknown'} | IP: ${event.ip} | Risk: ${event.riskScore}`);
    
    if (event.level === SecurityLevel.CRITICAL || event.riskScore >= 70) {
      console.log(`   Details:`, JSON.stringify(event.details, null, 2));
    }
  }

  // Cleanup methods
  private cleanupOldEvents(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp > oneDayAgo);
  }

  private cleanupBruteForceData(): void {
    const now = new Date();
    for (const [ip, data] of this.bruteForceMap.entries()) {
      // Удаляем старые записи
      if (now.getTime() - data.lastAttempt.getTime() > this.BRUTE_FORCE_WINDOW * 2) {
        this.bruteForceMap.delete(ip);
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  // API methods for monitoring
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit).reverse();
  }

  getEventsByType(type: SecurityEventType, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit)
      .reverse();
  }

  getHighRiskEvents(minRiskScore: number = 70): SecurityEvent[] {
    return this.events
      .filter(event => event.riskScore >= minRiskScore)
      .slice(-100)
      .reverse();
  }

  getBruteForceStatus(): Array<BruteForceDetection & { ip: string }> {
    return Array.from(this.bruteForceMap.values());
  }

  getSuspiciousIPs(): string[] {
    return Array.from(this.suspiciousIPs);
  }

  getSecurityStats(): {
    totalEvents: number;
    eventsByLevel: Record<SecurityLevel, number>;
    eventsByType: Record<SecurityEventType, number>;
    blockedIPs: number;
    suspiciousIPs: number;
    avgRiskScore: number;
    recentFailures: number;
    rateLimitEvents: number;
  } {
    const eventsByLevel = Object.values(SecurityLevel).reduce((acc, level) => {
      acc[level] = this.events.filter(e => e.level === level).length;
      return acc;
    }, {} as Record<SecurityLevel, number>);

    const eventsByType = Object.values(SecurityEventType).reduce((acc, type) => {
      acc[type] = this.events.filter(e => e.type === type).length;
      return acc;
    }, {} as Record<SecurityEventType, number>);

    const avgRiskScore = this.events.length > 0 
      ? this.events.reduce((sum, e) => sum + e.riskScore, 0) / this.events.length 
      : 0;

    return {
      totalEvents: this.events.length,
      eventsByLevel,
      eventsByType,
      blockedIPs: Array.from(this.bruteForceMap.values()).filter(b => b.blocked).length,
      suspiciousIPs: this.suspiciousIPs.size,
      avgRiskScore: Math.round(avgRiskScore),
      recentFailures: (eventsByType[SecurityEventType.LOGIN_FAILED] || 0) + (eventsByType[SecurityEventType.MFA_FAILED] || 0),
      rateLimitEvents: eventsByType[SecurityEventType.RATE_LIMIT_EXCEEDED] || 0
    };
  }
}

// Singleton instance
export const securityLogger = new SecurityLogger();
export default securityLogger;
