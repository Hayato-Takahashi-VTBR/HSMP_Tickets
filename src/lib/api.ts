const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';

export function apiUrl(path: string): string {
  if (import.meta.env.PROD && !apiBaseUrl) {
    throw new Error(
      'A API não está configurada. Defina VITE_API_BASE_URL com a URL do serviço no Render e publique o site novamente.',
    );
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

export function minecraftSkinUrl(nick: string, cacheKey?: string | number): string {
  const url = `https://minotar.net/helm/${encodeURIComponent(nick)}/128.png`;
  return cacheKey === undefined
    ? url
    : `${url}?v=${encodeURIComponent(String(cacheKey))}`;
}
