import { SPOILER_CONFIG } from '@/config/spoiler-config';

/**
 * Zensiert einen Hinweis (Hint), falls er Spoiler zum Artist oder Titel enthält.
 * 
 * @param hint - Der Text des Hinweises
 * @param artist - Name des Künstlers
 * @param title - Name des Titels
 * @returns Der zensierte Text
 */
export function censorHint(hint: string, artist: string, title: string): string {
  if (!hint) return '';

  // 1. Tokens extrahieren (Wörter ohne Sonderzeichen)
  const tokensToCensor = new Set<string>();

  // Artist & Titel verarbeiten
  [artist, title].forEach(text => {
    // Falls der Text komplett in den Ausnahmen ist (z.B. "BTS")
    const cleanFull = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (SPOILER_CONFIG.EXCEPTIONS.includes(cleanFull)) {
      tokensToCensor.add(text);
    }

    // Einzelne Wörter verarbeiten
    const words = text.split(/[\s\-&,/]+/);
    words.forEach(word => {
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
      // Filter: Ignoriere Wörter aus der White-List (THE, AND, etc.)
      if (SPOILER_CONFIG.IGNORE_WORDS.includes(cleanWord)) return;

      // Filter: Muss >= MIN_LENGTH sein ODER explizit in EXCEPTIONS stehen
      if (cleanWord.length >= SPOILER_CONFIG.MIN_LENGTH || SPOILER_CONFIG.EXCEPTIONS.includes(cleanWord)) {
        tokensToCensor.add(word);
      }
    });
  });

  let censoredHint = hint;

  // 2. Ersetzung durchführen (sortiert nach Länge, damit längere Phrasen zuerst ersetzt werden)
  const sortedTokens = Array.from(tokensToCensor)
    .filter(t => t.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const token of sortedTokens) {
    // Regex für das Token (case-insensitive, beachtet Wortgrenzen für kurze Wörter)
    // Bei kurzen Exceptions (BTS) erzwingen wir Wortgrenzen, bei langen (> 4) sind wir großzügiger
    const isShort = token.length < 4;
    const regexSource = isShort 
      ? `\\b${escapeRegExp(token)}\\b` 
      : escapeRegExp(token);
    
    const regex = new RegExp(regexSource, 'gi');
    censoredHint = censoredHint.replace(regex, '[XXX]');
  }

  return censoredHint;
}

/** Hilfsfunktion für Regex-Sonderzeichen */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
