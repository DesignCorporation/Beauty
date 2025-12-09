import fs from 'node:fs';
import path from 'node:path';

export type ConnectionServiceType = 'gateway' | 'backend' | 'frontend' | 'infrastructure';

export interface ConnectionRoute {
  gatewayPath: string;
  targetService: string;
  targetPath?: string;
  pathRewrite?: Record<string, string> | null;
  methods?: string[];
  authRequired?: boolean;
  public?: boolean;
  description?: string;
}

export interface ConnectionWebSocket {
  path: string;
  targetService: string;
  description?: string;
}

export interface ConnectionService {
  id: string;
  type: ConnectionServiceType;
  port?: string | undefined;
  host?: string | undefined;
  baseUrl?: string | undefined;
  health?: string | undefined;
  description?: string | undefined;
  routes?: ConnectionRoute[] | undefined;
  websocket?: ConnectionWebSocket | undefined;
}

export interface ConnectionMap {
  version: string;
  generatedAt?: string;
  services: Record<string, ConnectionService>;
}

const CONNECTION_MAP_PATH = path.resolve(__dirname, 'connection-map.json');

const envRegex = /\$\{([\w\d_]+)\}/g;

const substituteEnv = (value: string): string => {
  return value.replace(envRegex, (_match, varName) => process.env[varName] || '');
};

export function loadRawConnectionMap(): ConnectionMap {
  const raw = fs.readFileSync(CONNECTION_MAP_PATH, 'utf-8');
  const json = JSON.parse(raw) as ConnectionMap;
  return json;
}

export function resolveConnectionMap(map: ConnectionMap): ConnectionMap {
  const resolved: ConnectionMap = {
    ...map,
    services: {}
  };

  Object.values(map.services).forEach(service => {
    const resolvedService: ConnectionService = {
      id: service.id,
      type: service.type,
      port: service.port ? substituteEnv(service.port) : undefined,
      host: service.host ? substituteEnv(service.host) : undefined,
      baseUrl: service.baseUrl ? substituteEnv(service.baseUrl) : undefined,
      health: service.health,
      description: service.description,
      routes: service.routes?.map(route => {
        const resolvedRoute: ConnectionRoute = {
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

export function validateConnectionMap(map: ConnectionMap): string[] {
  const errors: string[] = [];

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

export function loadConnectionMap(): ConnectionMap {
  const raw = loadRawConnectionMap();
  const resolved = resolveConnectionMap(raw);
  const errors = validateConnectionMap(resolved);
  if (errors.length) {
    throw new Error(`Connection Map validation failed: ${errors.join('; ')}`);
  }
  return resolved;
}

export { CONNECTION_MAP_PATH };
