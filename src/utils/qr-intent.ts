export type QrIntent =
  | { kind: 'player'; name: string }
  | { kind: 'session'; sessionCode: string }
  | { kind: 'pack'; packId: string }
  | { kind: 'unsupported-song-link'; songId: string }
  | { kind: 'unknown'; raw: string };

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function parseQrIntent(raw: string): QrIntent {
  const trimmed = raw.trim();

  if (trimmed.startsWith('@')) {
    return { kind: 'player', name: trimmed.slice(1).trim() };
  }

  const url = safeParseUrl(trimmed);
  if (!url) {
    return { kind: 'unknown', raw: raw.trim() };
  }

  const sessionCode = url.searchParams.get('session');
  if (sessionCode) {
    return { kind: 'session', sessionCode };
  }

  const packId = url.searchParams.get('pack');
  if (packId) {
    return { kind: 'pack', packId };
  }

  const legacySongId = url.searchParams.get('id');
  if (legacySongId) {
    return { kind: 'unsupported-song-link', songId: legacySongId };
  }

  return { kind: 'unknown', raw: raw.trim() };
}
