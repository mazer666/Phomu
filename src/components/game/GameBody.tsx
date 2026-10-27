/**
 * The body of the game screen.
 *
 * WHAT: the frame that holds the phase of the round — one column in the
 * portrait, two columns in the landscape.
 *
 * WHY the phase keeps its place in the tree: the phase of the round holds
 * the player of the music, and the player must not restart when the device
 * is turned. The column of the phase is therefore always the same element;
 * only the class of the frame and the column next to it change.
 *
 * WHY the side column is a sibling and not a wrapper: a sibling that comes
 * and goes does not remount the phase.
 */
'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import type { Player, Team, TeamMode } from '@/types/player';
import type { GameLayout } from '@/utils/orientation-layout';
import { GameSidePanel } from './GameSidePanel';

// ─── Props ────────────────────────────────────────────────────────

interface GameBodyProps {
  /** The layout the page draws. */
  layout: GameLayout;
  /** The players of the session. */
  players: Player[];
  /** The teams of the session. */
  teams: Team[];
  /** How the teams are organized. */
  teamMode: TeamMode;
  /** The points that win the game. */
  winCondition: number;
  /** Leaves the party and returns to the lobby. */
  onLeaveParty: () => void;
  /** Opens the full settings of the shell. */
  onOpenFullSettings: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function GameBody({
  layout,
  players,
  teams,
  teamMode,
  winCondition,
  onLeaveParty,
  onOpenFullSettings,
  children,
}: PropsWithChildren<GameBodyProps>) {
  return (
    <div className="flex-1 min-h-0 flex" data-columns={layout.columns}>
      {/* The phase of the round — always the first column */}
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>

      {/* The side column — only in the landscape */}
      {layout.scoreboardMode === 'column' && (
        <GameSidePanel
          players={players}
          teams={teams}
          teamMode={teamMode}
          winCondition={winCondition}
          onLeaveParty={onLeaveParty}
          onOpenFullSettings={onOpenFullSettings}
        />
      )}
    </div>
  );
}
