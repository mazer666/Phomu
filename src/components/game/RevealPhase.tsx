/**
 * RevealPhase
 *
 * Zeigt ausschließlich die für den jeweiligen Spielmodus relevante Auflösung.
 * Kein generischer Song-Dump — jede Modusantwort bekommt eine eigene visuelle Sprache.
 */
'use client';

import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import type { PhomuSong } from '@/types/song';
import type { PlayerAnswer } from '@/types/game-state';
import type { Player, Team } from '@/types/player';
import type { GameMode } from '@/config/game-config';

// ─── Props ────────────────────────────────────────────────────────

interface RevealPhaseProps {
  song: PhomuSong;
  currentMode: GameMode;
  answers: PlayerAnswer[];
  players: Player[];
  teams: Team[];
  winCondition: number;
  endingCondition: 'rounds' | 'points' | 'time';
  isGameOver: boolean;
  onNextRound: () => void;
  onEndGame: () => void;
  onOverrideCorrect?: () => void;
  onOverrideRedraw?: () => void;
  overrideGovernance?: 'host' | 'co-host' | 'majority';
}

// ─── Juicy CTA-Varianten ──────────────────────────────────────────

const SCORING_HEADERS = [
  'Punkte diese Runde',
  'Kassiert! 💰',
  'Wer hat abgeräumt?',
  'Das gab Punkte.',
  'Pluspunkte, bitte!',
  'Verdient!',
  'Auf die Konten!',
];

const NEXT_ROUND_LABELS = [
  'Nächste Runde →',
  'Weiter gehts! →',
  'Noch eine! →',
  'Los, nächster Song! →',
  'Nicht aufhören jetzt →',
  'Ran ans nächste →',
  'Weiter, weiter! →',
  'Tut nicht weh. Weiter →',
  'Kein Zurück mehr →',
];


function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickDeterministic<T>(items: T[], seed: string): T {
  if (items.length === 0) throw new Error('Cannot pick from empty array');
  const index = hashSeed(seed) % items.length;
  return items[index]!;
}

// ─── Modus-spezifische Reveal-Karten ─────────────────────────────

function buildTimelineHeadlines(year: number): string[] {
  const decade = Math.floor(year / 10) * 10;

  // Generic year-based
  const generic = [
    `Jahrgang ${year}!`,
    `Das war aus ${year}.`,
    `${year} — eingetütet.`,
    `Zeitkapsel: ${year}.`,
    `${year}. Nicht ${year - 1}, nicht ${year + 1}.`,
    `Der Song stammt aus ${year}.`,
    `${year}. Exakt.`,
    `${year}. So ist das.`,
    `Anno ${year}.`,
    `${year} war das Jahr.`,
    `Der Song? ${year}. Gesetzt.`,
    `${year}. Eingetütet, eingemauert, fertig.`,
    `Richtig ist ${year}. Immer war es ${year}.`,
    `Dieses Lied atmet ${year}.`,
    `${year}. Man riecht es förmlich.`,
    `Stempel drauf: ${year}.`,
    `${year}. Kein Jahr davor, keins danach.`,
    `Akte geschlossen: ${year}.`,
    `${year}. Fakt. Unverrückbar.`,
    `Das ist ${year}. Ende der Diskussion.`,
    `${year} und kein bisschen älter.`,
    `Von ${year}. Absolut von ${year}.`,
    `${year} — das war die Antwort.`,
    `Dieser Sound gehört zu ${year}.`,
    `${year}, du Legende.`,
    `Genau ${year}. Jetzt weißt du's.`,
    `Jahreszahl enthüllt: ${year}.`,
    `${year}. Wer das wusste, darf stolz sein.`,
    `${year} war das Ding.`,
    `${year}. Keine Diskussion, kein Widerspruch.`,
  ];

  // Decade-flavoured
  const byDecade: Record<number, string[]> = {
    1950: [
      `${year}? Die 50er grüßen.`,
      `Petticoat, Jukebox, ${year}.`,
      `Rock'n'Roll-Ära — Jahrgang ${year}.`,
      `Als Elvis noch frisch war. ${year}.`,
    ],
    1960: [
      `${year}. Flower Power oder British Invasion?`,
      `Swinging Sixties. Jahrgang ${year}.`,
      `${year} — Beatlemania war irgendwo da.`,
      `Summer of Love-Dekade: ${year}.`,
      `${year}. Die Welt hat damals noch Gitarre gespielt.`,
    ],
    1970: [
      `${year}. Disco oder Punk? Beides richtig.`,
      `Schlaghosen-Jahrgang ${year}.`,
      `${year}. Boogie Wonderland lässt grüßen.`,
      `Glam, Funk, Prog — ${year}.`,
      `${year}. Saturday Night war jede Nacht.`,
      `${year}. Bee Gees oder Ramones, du weißt Bescheid.`,
    ],
    1980: [
      `${year}. Synthesizer, Schulterpolster, Neonlicht.`,
      `New Wave-Jahrgang ${year}.`,
      `${year}. MTV hat's gerade erst erfunden.`,
      `${year} — Kassette war das Medium.`,
      `Achtziger-Klassiker: ${year}.`,
      `${year}. Schnauzbart war Pflicht.`,
      `${year}. Depeche Mode nickt wissend.`,
      `${year}. Irgendwo zwischen Synthpop und Big Hair.`,
    ],
    1990: [
      `${year}. Grunge trifft Eurodance — welcome to the 90s.`,
      `Neunziger-Ding: ${year}.`,
      `${year}. Kurt oder Kylie? Beides war da.`,
      `${year} — CD-Player Pflichtausrüstung.`,
      `${year}. Britpop, Techno, Boyband. Alles gleichzeitig.`,
      `${year}. Als "Everybody" noch wirklich jeder kannte.`,
      `${year}. MSN-Messenger-Ära, ungefähr.`,
    ],
    2000: [
      `${year}. iPod-Ära. MySpace-Ära.`,
      `Nullerjahre: ${year}.`,
      `${year}. Tiefgeschnittene Jeans und Motorola Razr.`,
      `${year}. Vor Spotify, nach Napster.`,
      `${year}. Pop-Punk ODER R&B, pick one.`,
      `${year} — Limewire hat diesen Song gemacht.`,
      `${year}. Die Charts auf MTV gelesen.`,
    ],
    2010: [
      `${year}. EDM-Drop-Dekade.`,
      `Zehnerjahre-Sound: ${year}.`,
      `${year}. Zwischen Dubstep und Streaming-Boom.`,
      `${year}. Als alle plötzlich Bärte hatten.`,
      `${year}. Festival-Armband-Ära.`,
      `${year} — Snapchat war irgendwo da.`,
      `${year}. Post-Gangnam-Style-Universum.`,
    ],
    2020: [
      `${year}. Das ist verdammt nochmal aktuell.`,
      `${year}. TikTok-Zeitalter.`,
      `${year}. Streaming only, klar.`,
      `${year}. Neulich. Richtig neulich.`,
      `${year}. Jünger als der letzte Lockdown.`,
    ],
  };

  return [...generic, ...(byDecade[decade] ?? [])];
}

function TimelineReveal({ song }: { song: PhomuSong }) {
  const headlines = useMemo(() => buildTimelineHeadlines(song.year), [song.year]);
  const headline = useMemo(() => pickDeterministic(headlines, `timeline:${song.id}`), [headlines, song.id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.08))', border: '2px solid rgba(6,182,212,0.4)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-3">📅 Zeitauflösung</p>
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.15 }}
        className="text-8xl font-black tabular-nums mb-3"
        style={{ color: '#22d3ee', textShadow: '0 0 40px rgba(34,211,238,0.5)' }}
      >
        {song.year}
      </motion.div>
      <p className="text-lg font-black mb-5" style={{ color: '#67e8f9' }}>{headline}</p>
      <SongAttribution song={song} />
    </motion.div>
  );
}

function HintMasterReveal({ song }: { song: PhomuSong }) {
  const sublines = useMemo(() => [
    'Hinweise entschlüsselt!',
    'Case closed!',
    'Die Identität ist gelüftet.',
    'Detektiv-Arbeit abgeschlossen.',
    'Der Song hat sich verraten.',
    'Kein Geheimnis mehr.',
  ], []);
  const subline = useMemo(() => pickDeterministic(sublines, `hint:${song.id}`), [sublines, song.id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center"
      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.08))', border: '2px solid rgba(139,92,246,0.4)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-4">🕵️ {subline}</p>
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-4xl font-black leading-tight mb-2"
        style={{ color: '#c4b5fd' }}
      >
        {song.title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-bold opacity-80 mb-2"
      >
        {song.artist}
      </motion.p>
      <p className="text-xs opacity-30 font-black uppercase tracking-widest mt-4">
        {Math.floor(song.year / 10) * 10}er
      </p>
    </motion.div>
  );
}

function LyricsReveal({ song }: { song: PhomuSong }) {
  const fakeLabels = useMemo(() => [
    'Die Fälschung war …',
    'KI-generiert, nicht echt:',
    'Das haben wir uns ausgedacht:',
    'Fake-News: Musikedition.',
    'Diese Zeile war nie in dem Song:',
    'Unser kreativer Beitrag:',
  ], []);
  const fakeLabel = useMemo(() => pickDeterministic(fakeLabels, `lyrics:${song.id}`), [fakeLabels, song.id]);

  if (!song.lyrics) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-7 text-center bg-white/5 border border-white/10"
      >
        <p className="text-2xl font-black mb-2">{song.title}</p>
        <p className="opacity-60">{song.artist}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-7 space-y-5"
      style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(244,63,94,0.06))', border: '2px solid rgba(239,68,68,0.35)' }}
    >
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 opacity-80 mb-3">📝 {fakeLabel}</p>
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base font-mono italic text-red-300 leading-relaxed px-2"
        >
          &ldquo;{song.lyrics.fake}&rdquo;
        </motion.p>
      </div>
      <div className="flex justify-center">
        <span className="px-4 py-1.5 bg-green-500/20 text-green-400 text-[10px] font-black rounded-full border border-green-500/25 uppercase tracking-widest">
          die anderen 3 zeilen waren echt
        </span>
      </div>
      <SongAttribution song={song} />
    </motion.div>
  );
}

function VibeCheckReveal({ song }: { song: PhomuSong }) {
  const headlines = useMemo(() => [
    'Die Stimmung war …',
    'Vibe gecheckt!',
    'So klingt das eben.',
    'Der Mood-Report:',
    'Offiziell bestätigt:',
    'Das ist die Energie dieses Songs:',
  ], []);
  const headline = useMemo(() => pickDeterministic(headlines, `cover:${song.id}`), [headlines, song.id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center"
      style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))', border: '2px solid rgba(34,197,94,0.35)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-400 opacity-80 mb-5">😎 {headline}</p>
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {song.mood.map((m, i) => (
          <motion.span
            key={m}
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 18, delay: 0.1 + i * 0.08 }}
            className="px-6 py-3 rounded-full font-black text-lg text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.35)' }}
          >
            {m}
          </motion.span>
        ))}
      </div>
      <SongAttribution song={song} />
    </motion.div>
  );
}

function SurvivorReveal({ song }: { song: PhomuSong }) {
  const isOHW = song.isOneHitWonder;

  const yesHeadlines = useMemo(() => [
    `${song.artist} — tatsächlich ein One-Hit-Wonder.`,
    `Einmal Bühne, dann Stille: ${song.artist}.`,
    `${song.artist} hatte diesen einen Moment.`,
    `Ja! ${song.artist} ist ein One-Hit-Wonder.`,
    `Kurze Karriere, großer Hit: ${song.artist}.`,
  ], [song.artist]);

  const noHeadlines = useMemo(() => [
    `${song.artist} — echter Dauerstar.`,
    `${song.artist} ist kein One-Hit-Wonder.`,
    `Kein Eintagsfliegen: ${song.artist}.`,
    `${song.artist} hat mehr als einen Hit vorzuweisen.`,
    `Dauerläufer: ${song.artist} bleibt.`,
  ], [song.artist]);

  const headline = useMemo(() => {
    const pool = isOHW ? yesHeadlines : noHeadlines;
    return pickDeterministic(pool, `survivor:${song.id}:${isOHW ? 'yes' : 'no'}`);
  }, [isOHW, song.id, yesHeadlines, noHeadlines]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center"
      style={isOHW
        ? { background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(244,63,94,0.08))', border: '2px solid rgba(239,68,68,0.4)' }
        : { background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(234,179,8,0.08))', border: '2px solid rgba(250,204,21,0.4)' }
      }
    >
      <motion.div
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }}
        className="text-6xl mb-4"
      >
        {isOHW ? '✋' : '🌟'}
      </motion.div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-3">🏆 Survivor-Auflösung</p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-xl font-black leading-snug mb-5"
        style={{ color: isOHW ? '#fca5a5' : '#fde68a' }}
      >
        {headline}
      </motion.p>
      <SongAttribution song={song} />
    </motion.div>
  );
}

function CoverConfusionReveal({ song }: { song: PhomuSong }) {
  const headlines = useMemo(() => [
    'Das Original kam von …',
    'Hinter der Maske:',
    "Wer war's wirklich?",
    'Der echte Urheber:',
    'Originalquelle bestätigt:',
    'Das haben die eigentlich erfunden:',
  ], []);
  const headline = useMemo(() => pickDeterministic(headlines, `cover:${song.id}`), [headlines, song.id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center"
      style={{ background: 'linear-gradient(135deg, rgba(var(--color-accent-rgb),0.15), rgba(var(--color-accent-rgb),0.05))', border: '2px solid rgba(var(--color-accent-rgb),0.4)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-4">🎭 {headline}</p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-black mb-2"
        style={{ color: 'var(--color-accent)' }}
      >
        {song.artist}
      </motion.p>
      <p className="text-lg font-bold opacity-70 mb-4">{song.title}</p>
      {song.links.coverLink && (
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
          Wir haben eine Cover-Version gehört
        </span>
      )}
    </motion.div>
  );
}

// ─── Kleine Hilfskomponente: diskrete Song-Attribution ────────────

function SongAttribution({ song }: { song: PhomuSong }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest opacity-25 mt-2">
      {song.title} &middot; {song.artist}
    </p>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────

export function RevealPhase({
  song,
  currentMode,
  answers,
  players,
  teams,
  winCondition,
  endingCondition,
  isGameOver,
  onNextRound,
  onEndGame,
  onOverrideCorrect,
  onOverrideRedraw,
  overrideGovernance = 'host',
}: RevealPhaseProps) {

  const [showPowerMenu, setShowPowerMenu] = useState(false);

  const scoringHeader = useMemo(() => pickDeterministic(SCORING_HEADERS, `score:${song.id}:${currentMode}`), [song.id, currentMode]);
  const nextRoundLabel = useMemo(() => pickDeterministic(NEXT_ROUND_LABELS, `next:${song.id}:${answers.length}`), [song.id, answers.length]);

  // Gewinner-Logik
  const showWinUI = isGameOver || (endingCondition === 'points' && (
    players.some((p) => p.score >= winCondition) ||
    teams.some((t) => t.score >= winCondition)
  ));

  let winnerTitle: string | null = null;
  if (showWinUI) {
    const topPlayer = [...players].sort((a, b) => b.score - a.score)[0];
    const topTeam = [...teams].sort((a, b) => b.score - a.score)[0];
    const isTeamMode = teams.length > 0;
    if (isTeamMode && topTeam) {
      winnerTitle = `🏆 Team ${topTeam.name} hat gewonnen!`;
    } else if (topPlayer) {
      winnerTitle = `🏆 ${topPlayer.name} hat gewonnen!`;
    }
  }

  // Punkte-Zusammenfassung
  const scoringRows = answers
    .filter((a) => a.pointsAwarded > 0)
    .map((a) => {
      const player = players.find((p) => p.id === a.playerId);
      return { player, points: a.pointsAwarded };
    })
    .filter((r): r is { player: Player; points: number } => r.player !== undefined);

  return (
    <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">

      {/* ── Modus-spezifische Auflösung ───────────────────────── */}
      {currentMode === 'timeline'         && <TimelineReveal song={song} />}
      {currentMode === 'hint-master'      && <HintMasterReveal song={song} />}
      {currentMode === 'lyrics'           && <LyricsReveal song={song} />}
      {currentMode === 'vibe-check'       && <VibeCheckReveal song={song} />}
      {currentMode === 'survivor'         && <SurvivorReveal song={song} />}
      {currentMode === 'cover-confusion'  && <CoverConfusionReveal song={song} />}

      {/* ── Punkte-Zusammenfassung ────────────────────────────── */}
      {scoringRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm font-bold opacity-70 mb-3">{scoringHeader}</p>
          <div className="space-y-2">
            {scoringRows.map(({ player, points }) => (
              <div key={player.id} className="flex items-center gap-3">
                <span className="text-lg" aria-hidden>{player.avatar ?? '🎵'}</span>
                <span className="flex-1 font-semibold text-sm" style={{ color: player.color }}>
                  {player.name}
                </span>
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="font-black text-sm"
                  style={{ color: 'var(--color-success)' }}
                >
                  +{points}
                </motion.span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Power-User Menü ───────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowPowerMenu((v) => !v)}
          className="text-[10px] opacity-20 hover:opacity-60 transition-opacity px-2 py-1"
          aria-label="Power Actions"
        >
          ⋯
        </button>
      </div>

      {showPowerMenu && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 -mt-4">
          <p className="text-[10px] uppercase tracking-wider opacity-60">
            Power User · Governance: {overrideGovernance}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { onOverrideCorrect?.(); setShowPowerMenu(false); }}
              className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
            >
              ✅ Antwort trotzdem korrekt werten
            </button>
            <button
              onClick={() => { onOverrideRedraw?.(); setShowPowerMenu(false); }}
              className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
            >
              🔄 Runde verwerfen & neue Frage
            </button>
          </div>
        </div>
      )}

      {/* ── Aktions-Buttons ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 mt-2"
      >
        {showWinUI ? (
          <>
            <p
              className="text-center font-black text-2xl"
              style={{ color: 'var(--color-secondary)' }}
            >
              {winnerTitle}
            </p>
            <button
              onClick={onEndGame}
              className="w-full py-4 rounded-2xl text-xl font-black shadow-lg"
              style={{ backgroundColor: 'var(--color-secondary)', color: '#000' }}
            >
              Zum Gewinner-Screen!
            </button>
          </>
        ) : (
          <button
            onClick={onNextRound}
            className="w-full py-4 rounded-2xl text-xl font-black shadow-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {nextRoundLabel}
          </button>
        )}
      </motion.div>
    </div>
  );
}
