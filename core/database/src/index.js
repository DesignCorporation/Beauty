"use strict";
// Beauty Platform Database Exports
// Domain-Driven Design Database Layer
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantPrisma = exports.prisma = void 0;
__exportStar(require("@prisma/client"), exports);
var prisma_1 = require("./prisma");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return __importDefault(prisma_1).default; } });
var tenant_isolation_1 = require("./tenant-isolation");
Object.defineProperty(exports, "tenantPrisma", { enumerable: true, get: function () { return tenant_isolation_1.tenantPrisma; } });
__exportStar(require("./seeds/service-presets"), exports);
__exportStar(require("./seeds/permissions"), exports);
