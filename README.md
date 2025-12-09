# Beauty Platform (clean baseline)

## Требования
- Node.js 22.21.1
- pnpm 10.24.0

## Быстрый старт (dev)
```bash
pnpm install
pnpm --filter core/database prisma:generate || true
pnpm --filter api-gateway dev
```

## Структура
- apps/ — фронты (admin, salon, client, landing)
- services/ — бэкенды (api-gateway, auth-service, salon-api и др.)
- core/, packages/ — общие модули и prisma
- deployment/, docker/ — инсталляция и шаблоны

## Ветки
- main — production
- develop — development
