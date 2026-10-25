/**
 * ConditionalNavBar
 *
 * Rendert die NavBar auf allen Seiten außer /game und /game-over,
 * da diese Seiten eigene Navigationsleisten haben.
 */
'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from './NavBar';

/** Pfade, auf denen die NavBar ausgeblendet wird */
const HIDDEN_PREFIXES = ['/game', '/game-over'];

export function ConditionalNavBar() {
  const pathname = usePathname();
  const isHidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isHidden) return null;
  return <NavBar />;
}
