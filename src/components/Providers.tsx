'use client';

/**
 * Providers Component
 *
 * Wraps the app with all necessary context providers:
 * - ThemeProvider: manages UI theme (jackbox, spotify, youtube, musicwall)
 * - i18n: initialized on first render for language support
 *
 * This is a client component because providers need browser APIs.
 */
import { type ReactNode, useEffect, useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function Providers({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  // Initialize i18next on the client side only
  useEffect(() => {
    import('@/i18n/config').then(() => {
      setIsReady(true);
    });
  }, []);

  // Show nothing until i18n is ready (prevents flash of untranslated content)
  if (!isReady) {
    return null;
  }

  return <ThemeProvider>{children}</ThemeProvider>;
}
