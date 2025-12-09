# DEPLOYMENT INSTRUCTIONS - AUTH SERVICE

## Проблема
Client Portal не может подключиться к Auth Service для регистрации клиентов из-за несовместимости cookie names в middleware.

## Решение
Обновлен middleware `/src/middleware/auth.ts` для поддержки client-specific cookies.

## Изменения
1. `beauty_access_token` - для стандартных пользователей (CRM, Admin)
2. `beauty_client_access_token` - для клиентского портала
3. Middleware теперь поддерживает оба типа cookies

## Production Deployment

### Шаг 1: Остановить Auth Service
```bash
pm2 stop beauty-auth-service
```

### Шаг 2: Обновить код на production сервере
```bash
cd /root/beauty-platform/services/auth-service
git pull origin main
```

### Шаг 3: Установить зависимости (если нужно)
```bash
npm install
```

### Шаг 4: Запустить Auth Service
```bash
pm2 start ecosystem.config.js
```

### Шаг 5: Проверить статус
```bash
pm2 status
curl https://auth.beauty.designcorp.eu/health
```

## Тестирование

### Client Registration (with CSRF)
```bash
# Получить CSRF токен
curl -c cookies.txt https://auth.beauty.designcorp.eu/auth/csrf-token

# Зарегистрировать клиента
curl -b cookies.txt -H "X-CSRF-Token: TOKEN_HERE" \
  -X POST https://auth.beauty.designcorp.eu/auth/register-client \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"test123"}'
```

### Client Profile (authenticated)
```bash
# После регистрации/логина cookies содержат beauty_client_access_token
curl -b cookies.txt https://auth.beauty.designcorp.eu/auth/client/profile
```

## Результат
- ✅ Client registration: работает с CSRF токеном
- ✅ Client login: работает с CSRF токеном  
- ✅ Client logout: работает с CSRF токеном
- ⚠️ Client profile: будет работать после deployment обновления middleware

## Важно
Обновленный middleware обратно совместим и не ломает существующую функциональность CRM/Admin Panel.