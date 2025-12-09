// Используем глобальный fetch, если доступен (браузер/Vite).
// Для SSR/Node можно заменить через options.fetchImpl.
const globalFetch = (globalThis as any).fetch;

export const fetch = globalFetch
  ? globalFetch.bind(globalThis)
  : undefined;
