"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONNECTION_MAP_PATH = void 0;
exports.loadRawConnectionMap = loadRawConnectionMap;
exports.resolveConnectionMap = resolveConnectionMap;
exports.validateConnectionMap = validateConnectionMap;
exports.loadConnectionMap = loadConnectionMap;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const CONNECTION_MAP_PATH = node_path_1.default.resolve(__dirname, 'connection-map.json');
exports.CONNECTION_MAP_PATH = CONNECTION_MAP_PATH;
const envRegex = /\$\{([\w\d_]+)\}/g;
const substituteEnv = (value) => {
    return value.replace(envRegex, (_match, varName) => process.env[varName] || '');
};
function loadRawConnectionMap() {
    const raw = node_fs_1.default.readFileSync(CONNECTION_MAP_PATH, 'utf-8');
    const json = JSON.parse(raw);
    return json;
}
function resolveConnectionMap(map) {
    const resolved = {
        ...map,
        services: {}
    };
    Object.values(map.services).forEach(service => {
        const resolvedService = {
            id: service.id,
            type: service.type,
            port: service.port ? substituteEnv(service.port) : undefined,
            host: service.host ? substituteEnv(service.host) : undefined,
            baseUrl: service.baseUrl ? substituteEnv(service.baseUrl) : undefined,
            health: service.health,
            description: service.description,
            routes: service.routes?.map(route => {
                const resolvedRoute = {
                    ...route,
                    gatewayPath: substituteEnv(route.gatewayPath),
                    targetService: substituteEnv(route.targetService)
                };
                if (route.targetPath) {
                    resolvedRoute.targetPath = substituteEnv(route.targetPath);
                }
                return resolvedRoute;
            }),
            websocket: service.websocket
                ? {
                    ...service.websocket,
                    path: substituteEnv(service.websocket.path),
                    targetService: substituteEnv(service.websocket.targetService)
                }
                : undefined
        };
        resolved.services[service.id] = resolvedService;
    });
    return resolved;
}
function validateConnectionMap(map) {
    const errors = [];
    if (!map.version) {
        errors.push('version is required');
    }
    if (!map.services || typeof map.services !== 'object' || Object.keys(map.services).length === 0) {
        errors.push('services must be a non-empty object');
        return errors;
    }
    Object.values(map.services).forEach(service => {
        if (!service.id) {
            errors.push('service.id is required');
        }
        if (!service.type) {
            errors.push(`service ${service.id} type is required`);
        }
        service.routes?.forEach(route => {
            if (!route.gatewayPath) {
                errors.push(`route.gatewayPath is required for service ${service.id}`);
            }
            if (!route.targetService) {
                errors.push(`route.targetService is required for service ${service.id}`);
            }
        });
    });
    return errors;
}
function loadConnectionMap() {
    const raw = loadRawConnectionMap();
    const resolved = resolveConnectionMap(raw);
    const errors = validateConnectionMap(resolved);
    if (errors.length) {
        throw new Error(`Connection Map validation failed: ${errors.join('; ')}`);
    }
    return resolved;
}
//# sourceMappingURL=connection-map.js.map