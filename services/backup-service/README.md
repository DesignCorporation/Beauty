# Beauty Platform - Backup Service

Enterprise backup management service для Beauty Platform. Интегрируется с существующим `production-backup.sh` скриптом и предоставляет REST API + WebSocket для управления системой резервного копирования.

## 🚀 Возможности

- **REST API** - Полнофункциональное управление backup'ами
- **Real-time мониторинг** - WebSocket для отслеживания прогресса
- **JWT аутентификация** - Интеграция с Auth Service
- **Super Admin авторизация** - Доступ только для администраторов
- **Интеграция со скриптами** - Использует существующий production-backup.sh
- **Скачивание backup'ов** - Поддержка скачивания архивов
- **Конфигурация системы** - Управление настройками backup

## 🛠️ Технологический стек

- **Node.js** + **TypeScript**
- **Express.js** - REST API
- **Socket.IO** - WebSocket коммуникация
- **JWT** - Аутентификация
- **Pino** - Структурированное логирование
- **Joi** - Валидация данных
- **PM2** - Process management

## 📋 API Endpoints

### Authentication
Все endpoints требуют JWT токен с ролью `SUPER_ADMIN`.

```bash
Authorization: Bearer <jwt_token>
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check сервиса |
| `GET` | `/api/backup/status` | Системный статус |
| `GET` | `/api/backup/list` | Список всех backup'ов |
| `POST` | `/api/backup/create` | Создание нового backup'а |
| `DELETE` | `/api/backup/:id` | Удаление backup'а |
| `GET` | `/api/backup/:id/download` | Скачивание backup'а |
| `GET` | `/api/backup/logs` | Логи системы |
| `GET` | `/api/backup/config` | Конфигурация системы |
| `PUT` | `/api/backup/config` | Обновление конфигурации |

## 🔌 WebSocket События

Подключение: `ws://host:6027/backup-ws`

### События от клиента:
- `authenticate` - Аутентификация соединения
- `subscribe-backup-events` - Подписка на события
- `get-realtime-status` - Получение статуса

### События от сервера:
- `backup-progress` - Прогресс выполнения backup'а
- `backup-completed` - Завершение backup'а
- `backup-error` - Ошибка backup'а
- `system-notification` - Системные уведомления

## 🚀 Развертывание

### 1. Установка зависимостей
```bash
cd /root/beauty-platform/services/backup-service
pnpm install
```

### 2. Конфигурация
Настройте файл `.env`:
```bash
cp .env.example .env
# Отредактируйте .env файл
```

### 3. Сборка
```bash
pnpm run build
```

### 4. Запуск с PM2
```bash
./deploy.sh
```

Или вручную:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

## 📊 Мониторинг

```bash
# Статус сервиса
pm2 status backup-service

# Логи
pm2 logs backup-service

# Системные метрики
pm2 monit

# Health check
curl http://135.181.156.117:6027/health
```

## 🔧 Интеграция со скриптами

Сервис использует существующий скрипт `/root/SCRIPTS/production-backup.sh`:

- **НЕ модифицирует** скрипт
- Запускает через `child_process.spawn`
- Парсит вывод для отслеживания прогресса
- Читает результаты из `/root/BACKUPS/production/`

## 💾 Структура backup'ов

```
/root/BACKUPS/production/
├── backup-20250821_030001/
│   ├── beauty-platform.tar.gz
│   ├── beauty_platform_new.sql
│   ├── beauty_audit.sql
│   ├── nginx-configs.tar.gz
│   ├── images-uploads.tar.gz
│   ├── configs/
│   └── system-info/
└── latest -> backup-20250821_030001/
```

## 🔒 Безопасность

- **JWT аутентификация** - Обязательна для всех endpoints
- **Super Admin авторизация** - Только роль `SUPER_ADMIN`
- **Rate limiting** - Защита от злоупотребления
- **Audit logging** - Полное логирование всех операций
- **CORS защита** - Только разрешенные домены
- **Helmet.js** - Security headers

## 🧪 Тестирование

### Создание тестового токена:
```typescript
import { createSuperAdminToken } from './src/utils/jwt'

const token = createSuperAdminToken('admin-user-id')
console.log('Bearer', token)
```

### Тестовые запросы:
```bash
# Health check
curl http://localhost:6027/health

# Системный статус
curl -H "Authorization: Bearer <token>" \
     http://localhost:6027/api/backup/status

# Создание backup'а
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"type":"manual","description":"Test backup"}' \
     http://localhost:6027/api/backup/create
```

## 📈 Конфигурация системы

```json
{
  "enabled": true,
  "schedule": "0 3 * * *",
  "retention": {
    "daily": 7,
    "weekly": 4,
    "monthly": 12
  },
  "compression": true,
  "encryption": false,
  "notifications": {
    "email": false,
    "webhook": ""
  },
  "components": {
    "databases": true,
    "applicationFiles": true,
    "uploads": true,
    "configs": true,
    "nginx": true,
    "ssl": true,
    "systemInfo": true
  }
}
```

## 🐛 Отладка

### Логи сервиса:
```bash
tail -f /var/log/pm2/backup-service.log
```

### Логи backup скрипта:
```bash
tail -f /var/log/beauty-backup.log
```

### Тестирование скрипта:
```bash
curl -X POST \
     -H "Authorization: Bearer <token>" \
     http://localhost:6027/api/backup/test-script
```

## ⚡ Производительность

- **Single instance** - Backup операции выполняются последовательно
- **Memory limit** - 1GB через PM2
- **Rate limiting** - 200 requests/15min
- **WebSocket heartbeat** - 30 секунд
- **Graceful shutdown** - 30 секунд timeout

## 🔮 Будущие улучшения

- [ ] **Email уведомления** - Интеграция с email сервисом
- [ ] **Webhook notifications** - POST уведомления на URL
- [ ] **Incremental backups** - Инкрементальные backup'ы
- [ ] **Cloud storage** - Интеграция с AWS S3/Google Cloud
- [ ] **Backup validation** - Автоматическая проверка целостности
- [ ] **Scheduled cleanup** - Автоматическая очистка старых backup'ов
- [ ] **Compression levels** - Настраиваемые уровни сжатия
- [ ] **Encryption at rest** - Шифрование backup'ов

## 🆘 Поддержка

При проблемах с сервисом:

1. Проверьте статус: `pm2 status backup-service`
2. Проверьте логи: `pm2 logs backup-service`
3. Проверьте health endpoint: `curl localhost:6027/health`
4. Проверьте доступность скрипта: `ls -la /root/SCRIPTS/production-backup.sh`
5. Проверьте права доступа к backup директории: `ls -la /root/BACKUPS/`

## 📝 Лицензия

© 2025 Beauty Platform. Все права защищены.