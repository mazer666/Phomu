/**
 * ConditionalNavBar
 *
 * Renders the NavBar on all pages except /game and /game-over,
 * because those pages have their own navigation bars.
 */
'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from './NavBar';

/** Paths on which the NavBar is hidden */
const HIDDEN_PREFIXES = ['/game', '/game-over'];

export function ConditionalNavBar() {
  const pathname = usePathname();
  const isHidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isHidden) return null;
  return <NavBar />;
}
