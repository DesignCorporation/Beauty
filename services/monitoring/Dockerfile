FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY core ./core
COPY packages ./packages
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

COPY services/monitoring ./services/monitoring
RUN pnpm --filter services/monitoring run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/monitoring/dist ./dist
COPY --from=builder /app/services/monitoring/package.json ./

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
