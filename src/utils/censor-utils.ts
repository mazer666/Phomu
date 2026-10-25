import { SPOILER_CONFIG } from '@/config/spoiler-config';

/**
 * Censors a hint if it contains a spoiler about the artist or the title.
 *
 * @param hint - The text of the hint
 * @param artist - Name of the artist
 * @param title - Name of the title
 * @returns The censored text
 */
export function censorHint(hint: string, artist: string, title: string): string {
  if (!hint) return '';

  // 1. Extract tokens (words without special characters)
  const tokensToCensor = new Set<string>();

  // Process artist & title
  [artist, title].forEach(text => {
    // If the text is entirely in the exceptions (e.g. "BTS")
    const cleanFull = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (SPOILER_CONFIG.EXCEPTIONS.includes(cleanFull)) {
      tokensToCensor.add(text);
    }

    // Process individual words
    const words = text.split(/[\s\-&,/]+/);
    words.forEach(word => {
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
      // Filter: ignore words from the allow list (THE, AND, etc.)
      if (SPOILER_CONFIG.IGNORE_WORDS.includes(cleanWord)) return;

      // Filter: must be >= MIN_LENGTH OR explicitly listed in EXCEPTIONS
      if (cleanWord.length >= SPOILER_CONFIG.MIN_LENGTH || SPOILER_CONFIG.EXCEPTIONS.includes(cleanWord)) {
        tokensToCensor.add(word);
      }
    });
  });

  let censoredHint = hint;

  // 2. Perform the replacement (sorted by length so longer phrases are replaced first)
  const sortedTokens = Array.from(tokensToCensor)
    .filter(t => t.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const token of sortedTokens) {
    // Regex for the token (case-insensitive, respects word boundaries for short words)
    // For short exceptions (BTS) we enforce word boundaries, for long ones (> 4) we are more lenient
    const isShort = token.length < 4;
    const regexSource = isShort 
      ? `\\b${escapeRegExp(token)}\\b` 
      : escapeRegExp(token);
    
    const regex = new RegExp(regexSource, 'gi');
    censoredHint = censoredHint.replace(regex, '[XXX]');
  }

  return censoredHint;
}

/** Helper for regex special characters */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
