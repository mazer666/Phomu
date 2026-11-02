'use client';

import {
  cloneElement,
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { RoundPhase } from '@/types/game-state';

interface ActionContext {
  phase: RoundPhase;
  slot: HTMLDivElement | null;
  setSlot: (slot: HTMLDivElement | null) => void;
}
const Context = createContext<ActionContext | null>(null);

/** The footer supplies the target; CSS remains the source of viewport rules. */
export function GameActionsProvider({
  phase,
  children,
}: {
  phase: RoundPhase;
  children: ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const context = useMemo(() => ({ phase, slot, setSlot }), [phase, slot]);
  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function GameActionSlot() {
  const context = useContext(Context);
  return <div className="game-action-slot" ref={context?.setSlot} />;
}

function subscribe(listener: () => void) {
  window.addEventListener('resize', listener);
  window.addEventListener('orientationchange', listener);
  return () => {
    window.removeEventListener('resize', listener);
    window.removeEventListener('orientationchange', listener);
  };
}

/** Move the real button, keeping its disabled state and handler in its mode. */
export function GameAction({
  phase,
  compactLabel,
  children,
}: {
  phase: RoundPhase;
  compactLabel?: ReactNode;
  children: ReactElement<{ children?: ReactNode }>;
}) {
  const context = useContext(Context);
  const slot = context?.slot;
  const compact = useSyncExternalStore(
    subscribe,
    () =>
      !!slot?.parentElement &&
      getComputedStyle(slot.parentElement).display !== 'none',
    () => false
  );
  // The question stays mounted under the reveal to preserve its media player.
  // Its portal must stop displaying actions when the phase changes.
  if (context && context.phase !== phase) return null;
  if (!compact || !slot) return children;
  return createPortal(
    <div className="game-primary-action">
      {compactLabel === undefined
        ? children
        : cloneElement(children, { children: compactLabel })}
    </div>,
    slot
  );
}
