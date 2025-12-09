"use strict";
// Prisma Client Instance
// Beauty Platform Database Connection
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Prevent multiple instances in development
const prisma = globalThis.__prisma || new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}
exports.default = prisma;
