/**
 * Cookie parser для WebSocket подключений
 * Socket.IO не может использовать стандартный cookieParser middleware
 */

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(';').forEach((cookie) => {
    const [name, value] = cookie.split('=').map((part) => part.trim());
    if (name && value) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }
  });

  return cookies;
}
