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
declare const CONNECTION_MAP_PATH: string;
export declare function loadRawConnectionMap(): ConnectionMap;
export declare function resolveConnectionMap(map: ConnectionMap): ConnectionMap;
export declare function validateConnectionMap(map: ConnectionMap): string[];
export declare function loadConnectionMap(): ConnectionMap;
export { CONNECTION_MAP_PATH };
//# sourceMappingURL=connection-map.d.ts.map