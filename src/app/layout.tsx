import type { Metadata, Viewport } from 'next';
import Providers from '@/components/Providers';
import { ConditionalNavBar } from '@/components/ui/ConditionalNavBar';
import { LanguageHtmlAttribute } from '@/components/LanguageHtmlAttribute';
import de from '@/i18n/locales/de.json';
import './globals.css';

/**
 * Reads a dotted translation path from a locale resource.
 *
 * Works both with flat dot-path resources (target format per CONTRACT §5) and
 * with nested resources (current format of de.json). This keeps the file
 * functional before and after the merge of `locales/parts/*.json`.
 */
function readTranslation(resources: unknown, key: string): string {
  if (typeof resources !== 'object' || resources === null) return key;

  const flat = (resources as Record<string, unknown>)[key];
  if (typeof flat === 'string') return flat;

  let current: unknown = resources;
  for (const segment of key.split('.')) {
    if (typeof current !== 'object' || current === null) return key;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : key;
}

/**
 * Server-side fallback language (DE is the primary language, see CONTRACT §1).
 * The static export bakes one language into the HTML head; the client side
 * (NavBar) keeps `document.title` and `<html lang>` in sync with the active
 * i18next language.
 */
const appTitle = readTranslation(de, 'app.title');
const appSubtitle = readTranslation(de, 'app.subtitle');
const appDescription = readTranslation(de, 'app.description');

export const metadata: Metadata = {
  title: `${appTitle} – ${appSubtitle}`,
  description: appDescription,
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png', sizes: '32x32' }],
    apple: [{ url: '/favicon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // Notch/Dynamic Island support
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" data-theme="jackbox" suppressHydrationWarning>
      {/* WHY the height: the page fills the screen and never scrolls. The
          bar above is fixed, the content of the page takes the rest and
          scrolls on its own — the window itself stays still. */}
      <body className="h-[100dvh] overflow-hidden flex flex-col">
        <Providers>
          <LanguageHtmlAttribute />
          <div className="shrink-0">
            <ConditionalNavBar />
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
