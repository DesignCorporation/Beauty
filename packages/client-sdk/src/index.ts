export type { BeautyApiClientOptions, RequestOptions } from './http-client';
export { BeautyApiClient } from './http-client';

export type { BeautyWebSocketOptions } from './ws-client';
export { connectWebSocket } from './ws-client';
export { useBeautyWebSocket } from './hooks/useBeautyWebSocket';
