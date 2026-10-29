/**
 * The failure of the core reaches the player.
 *
 * WHAT: the test of the hook that starts the session of the core — a
 * failure of the base has to land in the state of the session, and a
 * success has to clear it again.
 *
 * WHY the test exists: the hook used to write every failure into the
 * console. The player saw a button that did nothing and got no hint. The
 * two failures that were found in production (a catalogue that could not be
 * verified, a rejected queue strategy) had the same effect — nothing.
 *
 * WHY the base is mocked: the base is the Rust part of the product. The
 * test of the shell must be able to make it fail on purpose.
 *
 * EXAMPLE: the base refuses to draw a card — the state holds
 * `game.error.drawFailed`, and the next successful draw clears it.
 */
// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useGameStore } from '@/stores/game-store';
import type { RoundQuestion } from '@/core/types';
import { useCoreRound, type CoreRound } from './useCoreSession';

// The base of the product is replaced by spies — the test makes it fail on
// purpose.
const core = vi.hoisted(() => ({
  openSession: vi.fn(),
  drawRandom: vi.fn(),
  reveal: vi.fn(),
  advance: vi.fn(),
}));

vi.mock('@/core/session-service', () => core);

/** The commands of the round, as the last mounted hook returned them. */
let commands: CoreRound | null = null;

/**
 * The probe of the test: it mounts the hook and keeps its commands.
 */
function Probe() {
  const round = useCoreRound();
  useEffect(() => {
    commands = round;
  }, [round]);
  return null;
}

/**
 * A question of a round, as the core hands it over.
 *
 * @returns The question of the fixture
 */
function questionOf(): RoundQuestion {
  return {
    phase: 'question',
    roundNumber: 1,
    mode: 'timeline',
    hints: ['', '', '', '', ''],
    options: [],
    identity: null,
    pointsPossible: 5,
    answersLocked: false,
    songId: 's-a',
    media: {
      youtube: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
      youtubeAlternatives: [],
      spotify: null,
      spotifyFreePreview: null,
      amazonMusic: null,
      amazonPrimePreview: null,
      coverLink: null,
      startSeconds: 0,
      endSeconds: 0,
    },
    context: {
      timelineYears: [],
      timelineSlots: [],
      genre: 'Rock',
      pack: null,
    },
  };
}

/**
 * Mounts the hook and waits for the session of the core.
 *
 * @param root - The root of the test
 */
async function mountHook(root: Root): Promise<void> {
  await act(async () => {
    root.render(createElement(Probe));
  });
}

/**
 * Runs a command of the round and waits for it.
 *
 * @param command - The command of the round
 */
async function run(command: () => Promise<void>): Promise<void> {
  await act(async () => {
    await command();
  });
}

describe('the session of the core', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    vi.clearAllMocks();
    core.openSession.mockResolvedValue({
      phase: 'drawing',
      roundNumber: 1,
      mode: 'timeline',
      autoDraw: false,
    });
    core.drawRandom.mockResolvedValue(questionOf());
    core.reveal.mockResolvedValue(null);
    core.advance.mockResolvedValue({
      phase: 'drawing',
      roundNumber: 2,
      mode: 'timeline',
      autoDraw: false,
    });

    useGameStore.getState().initSession();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    // WHY: a mounted hook would hear every change of the store — the next
    // test would change it outside of `act`.
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('writes the failure of the core into the state', async () => {
    core.openSession.mockRejectedValue(new Error('CoreError: session refused'));

    await mountHook(root);

    // The player sees the failure — it is in the state of the session.
    expect(useGameStore.getState().error).toBe('game.error.coreUnavailable');
  });

  it('keeps the technical text of the failure in the console', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    core.openSession.mockRejectedValue(new Error('CoreError: session refused'));

    await mountHook(root);

    // WHY: the developer reads the trace in the console — the player reads
    // the sentence on the screen. Neither of them gets the text of the
    // other.
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('writes the failure of a card that could not be drawn into the state', async () => {
    core.openSession.mockResolvedValue({
      phase: 'drawing',
      roundNumber: 1,
      mode: 'timeline',
      autoDraw: false,
    });
    core.drawRandom.mockRejectedValue(new Error('CoreError: draw refused'));

    await mountHook(root);
    await run(() => commands!.drawCard());

    expect(useGameStore.getState().error).toBe('game.error.drawFailed');
  });

  it('writes the failure of a solution that could not be released into the state', async () => {
    core.openSession.mockResolvedValue({
      phase: 'drawing',
      roundNumber: 1,
      mode: 'timeline',
      autoDraw: false,
    });
    core.reveal.mockRejectedValue(new Error('CoreError: reveal refused'));

    await mountHook(root);
    await run(() => commands!.releaseSolution());

    expect(useGameStore.getState().error).toBe('game.error.revealFailed');
  });

  it('writes the failure of a round that could not be closed into the state', async () => {
    core.openSession.mockResolvedValue({
      phase: 'drawing',
      roundNumber: 1,
      mode: 'timeline',
      autoDraw: false,
    });
    core.advance.mockRejectedValue(new Error('CoreError: advance refused'));

    await mountHook(root);
    await run(() => commands!.closeRound());

    expect(useGameStore.getState().error).toBe('game.error.roundFailed');
  });

  it('clears the failure when the next step works', async () => {
    core.openSession.mockRejectedValue(new Error('CoreError: session refused'));

    await mountHook(root);
    expect(useGameStore.getState().error).toBe('game.error.coreUnavailable');

    // The core works again — the old failure must not stay on the screen.
    core.drawRandom.mockResolvedValue(questionOf());
    await run(() => commands!.drawCard());

    expect(useGameStore.getState().error).toBeNull();
  });

  it('does not persist the failure of the session', async () => {
    core.openSession.mockRejectedValue(new Error('CoreError: session refused'));

    await mountHook(root);

    // WHY: a failure belongs to the running session, not to the progress.
    // The stored state of the shell must not carry it.
    const stored = window.localStorage.getItem('phomu-game-state');
    expect(stored).not.toContain('game.error.coreUnavailable');
  });
});
