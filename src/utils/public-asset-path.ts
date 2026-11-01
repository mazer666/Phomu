/** Resolve local art under the configured export path without duplicating its prefix. */
export function publicAssetPath(
  path: string,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/Phomu'
): string {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const base = basePath.replace(/\/$/, '');
  const local = path.startsWith('/') ? path : `/${path}`;
  return base && (local === base || local.startsWith(`${base}/`))
    ? local
    : `${base}${local}`;
}
