const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

export function minecraftSkinUrl(nick: string, cacheKey?: string | number): string {
  const url = `https://minotar.net/helm/${encodeURIComponent(nick)}/128.png`;
  return cacheKey === undefined
    ? url
    : `${url}?v=${encodeURIComponent(String(cacheKey))}`;
}
