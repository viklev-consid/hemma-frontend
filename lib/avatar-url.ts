export function resolveAvatarUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `/api/proxy${url.startsWith("/") ? "" : "/"}${url}`;
}
