import axios from 'axios';
import { monitoringEvents } from '../routes/monitoring';

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

interface AlertPayload {
  service: string;
  previousStatus: string;
  currentStatus: string;
  responseTime: number;
  critical: boolean;
  error?: string;
  timestamp: Date;
}

export class TelegramAlert {
  private config: TelegramConfig;
  private lastAlerts: Map<string, Date> = new Map();
  private cooldownMinutes = 5; // Минимальный интервал между алертами для одного сервиса

  constructor(config: TelegramConfig) {
    this.config = config;
    
    if (this.config.enabled && this.config.botToken && this.config.chatId) {
      this.initializeEventListeners();
      console.log('📱 Telegram alerts initialized');
    } else {
      console.log('📱 Telegram alerts disabled (missing configuration)');
    }
  }

  private initializeEventListeners() {
    // Слушаем изменения статуса сервисов
    monitoringEvents.on('statusChange', (data: AlertPayload) => {
      this.handleStatusChange(data);
    });

    // Слушаем события перезапуска
    monitoringEvents.on('serviceRestart', (data: any) => {
      this.handleServiceRestart(data);
    });
  }

  private async handleStatusChange(data: AlertPayload) {
    if (!this.shouldSendAlert(data.service)) {
      return;
    }

    const message = this.formatStatusChangeMessage(data);
    await this.sendMessage(message, this.getMessagePriority(data));
    
    // Записываем время последнего алерта
    this.lastAlerts.set(data.service, new Date());
  }

  private async handleServiceRestart(data: any) {
    const message = this.formatRestartMessage(data);
    await this.sendMessage(message, 'medium');
  }

  private shouldSendAlert(serviceName: string): boolean {
    const lastAlert = this.lastAlerts.get(serviceName);
    if (!lastAlert) return true;

    const cooldownMs = this.cooldownMinutes * 60 * 1000;
    const timeSinceLastAlert = Date.now() - lastAlert.getTime();
    
    return timeSinceLastAlert > cooldownMs;
  }

  private formatStatusChangeMessage(data: AlertPayload): string {
    const { service, previousStatus, currentStatus, responseTime, critical, error, timestamp } = data;
    
    // Выбираем эмодзи в зависимости от статуса
    const statusEmoji = {
      online: '✅',
      offline: '🔴', 
      degraded: '⚠️'
    };

    const criticalFlag = critical ? '🚨 КРИТИЧЕСКИЙ СЕРВИС' : '🔔';
    const emoji = statusEmoji[currentStatus as keyof typeof statusEmoji] || '❓';
    
    let message = `${criticalFlag} ${emoji} **Beauty Platform Alert**\n\n`;
    message += `🔧 **Сервис:** ${service}\n`;
    message += `📊 **Статус:** ${previousStatus} → ${currentStatus}\n`;
    message += `⏱️ **Время ответа:** ${responseTime}ms\n`;
    message += `🕐 **Время:** ${timestamp.toLocaleString('ru-RU')}\n`;

    if (error) {
      message += `❌ **Ошибка:** ${error}\n`;
    }

    // Добавляем дополнительную информацию в зависимости от статуса
    if (currentStatus === 'offline') {
      message += '\n🔧 **Действия:**\n';
      message += '• Проверьте логи сервиса\n';
      message += '• Перезапустите через админку\n';
      message += '• Проверьте доступность порта\n';
    } else if (currentStatus === 'online' && previousStatus === 'offline') {
      message += '\n🎉 Сервис восстановлен!';
    } else if (currentStatus === 'degraded') {
      message += '\n⚠️ Сервис работает медленно. Проверьте нагрузку.';
    }

    return message;
  }

  private formatRestartMessage(data: any): string {
    let message = `🔄 **Service Restart**\n\n`;
    message += `🔧 **Сервис:** ${data.service}\n`;
    message += `🔌 **Порт:** ${data.port}\n`;
    message += `📊 **Статус:** ${data.status}\n`;
    message += `🕐 **Время:** ${data.timestamp.toLocaleString('ru-RU')}\n`;
    
    return message;
  }

  private getMessagePriority(data: AlertPayload): 'high' | 'medium' | 'low' {
    if (data.critical && data.currentStatus === 'offline') {
      return 'high';
    } else if (data.currentStatus === 'offline' || data.currentStatus === 'degraded') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private async sendMessage(message: string, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (!this.config.enabled) return;

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      
      // Настройки в зависимости от приоритета
      const options: any = {
        chat_id: this.config.chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      };

      // Для критических алертов включаем уведомления
      if (priority === 'high') {
        options.disable_notification = false;
      } else {
        options.disable_notification = true;
      }

      const response = await axios.post(url, options, {
        timeout: 10000
      });

      if (response.data.ok) {
        console.log(`📱 Telegram alert sent successfully (${priority} priority)`);
      } else {
        console.error('📱 Telegram API error:', response.data);
      }

    } catch (error: any) {
      console.error('📱 Failed to send Telegram alert:', error.message);
      
      // Логируем ошибки конфигурации для упрощения отладки
      if (error.response?.status === 400) {
        console.error('📱 Telegram configuration error. Check bot token and chat ID.');
      } else if (error.response?.status === 401) {
        console.error('📱 Telegram authentication failed. Invalid bot token.');
      }
    }
  }

  // Метод для тестирования алертов
  async sendTestAlert(): Promise<boolean> {
    try {
      const testMessage = `🧪 **Test Alert - Beauty Platform**\n\n` +
        `✅ Telegram alerts are working correctly!\n` +
        `🕐 Time: ${new Date().toLocaleString('ru-RU')}\n` +
        `🤖 Bot: Active\n` +
        `📱 Chat: Connected`;

      await this.sendMessage(testMessage, 'low');
      return true;
    } catch (error) {
      console.error('Failed to send test alert:', error);
      return false;
    }
  }

  // Обновление конфигурации
  updateConfig(newConfig: Partial<TelegramConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('📱 Telegram configuration updated');
  }

  // Получение статистики алертов
  getAlertStats() {
    return {
      enabled: this.config.enabled,
      configured: !!(this.config.botToken && this.config.chatId),
      lastAlerts: Array.from(this.lastAlerts.entries()).map(([service, date]) => ({
        service,
        lastAlert: date.toISOString()
      })),
      cooldownMinutes: this.cooldownMinutes
    };
  }

  // Сброс истории алертов (для тестирования)
  resetAlertHistory() {
    this.lastAlerts.clear();
    console.log('📱 Alert history cleared');
  }
}

// Инициализация Telegram алертов
const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHAT_ID || '';
const enabledEnv = process.env.TELEGRAM_ENABLED;
const enabledByDefault = !!(botToken && chatId);

export const telegramAlert = new TelegramAlert({
  botToken,
  chatId,
  enabled: enabledEnv ? enabledEnv === 'true' : enabledByDefault
});

export default telegramAlert;
