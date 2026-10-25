'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const MODE_CARDS = [
  {
    name: 'Timeline',
    emoji: '📅',
    visual: '━━●━━━━●━━',
    text: 'Song hören, Jahr einsortieren, Team feiern. Chronologie schlägt Chaos.',
  },
  {
    name: 'Hint Master',
    emoji: '🕵️',
    visual: '🧩 → 🧩 → 💡',
    text: 'Hinweise werden Stück für Stück klarer. Früher raten = mehr Punkte.',
  },
  {
    name: 'Lyrics',
    emoji: '📝',
    visual: 'A / B / C / D',
    text: 'Finde die Fake-Line. Klingt alles plausibel, nur eins ist gelogen.',
  },
  {
    name: 'Vibe Check',
    emoji: '🌈',
    visual: '😎 😢 ⚡ 🌙',
    text: 'Welche Stimmung passt? Bauchgefühl an, Overthinking aus.',
  },
  {
    name: 'Survivor',
    emoji: '🎯',
    visual: '1 Hit ?',
    text: 'One-Hit-Wonder oder Karriere-Monster? Setz deinen Musikinstinkt ein.',
  },
  {
    name: 'Cover Confusion',
    emoji: '🎭',
    visual: 'Original ↔ Cover',
    text: 'Wer war zuerst da? Original erkennen und Cover-Fallen vermeiden.',
  },
];

const QUICK_FLOW = [
  { step: '1', title: 'Lobby', text: 'Spieler rein, Team-Modus wählen, Pack aussuchen.' },
  { step: '2', title: 'Modi', text: 'Ein oder mehrere Modi aktivieren – Mix macht Würze.' },
  { step: '3', title: 'Audio', text: 'Provider & Lautstärke checken, dann losdrücken.' },
  { step: '4', title: 'Play', text: 'Raten, lachen, Punkte stacken. Repeat.' },
];

export default function GuidePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/15 via-orange-400/10 to-cyan-400/10 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">🧭 Spielhilfe</h1>
            <p className="mt-2 text-sm md:text-base opacity-85 max-w-2xl">
              Willkommen im Chaos-Kabarett der Ohrwürmer. Kurzfassung: drücken, hören, raten, jubeln.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-xs font-black uppercase tracking-wider"
          >
            Zurück
          </button>
        </div>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_FLOW.map((item, idx) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs uppercase font-black tracking-widest opacity-60">Step {item.step}</p>
            <h2 className="text-lg font-black mt-1">{item.title}</h2>
            <p className="text-sm opacity-80 mt-1">{item.text}</p>
          </motion.div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">🎮 Modi auf einen Blick</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODE_CARDS.map((mode, idx) => (
            <motion.article
              key={mode.name}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black">{mode.name}</h3>
                <span className="text-xl">{mode.emoji}</span>
              </div>
              <p className="font-mono text-xs mt-3 px-2 py-1 rounded-lg bg-black/30 inline-block">{mode.visual}</p>
              <p className="text-sm opacity-80 mt-2">{mode.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-black mb-2">⚙ Auswahlhilfe ohne Textwand</h2>
        <ul className="grid md:grid-cols-2 gap-2 text-sm">
          <li>• <strong>Neulinge:</strong> Timeline + Vibe Check starten.</li>
          <li>• <strong>Party-Modus:</strong> 3 Modi mischen für mehr Abwechslung.</li>
          <li>• <strong>Knifflig:</strong> Hint Master + Cover Confusion.</li>
          <li>• <strong>Schnellrunde:</strong> wenig Modi, kurze Audio-Snippets.</li>
        </ul>
      </section>

      <footer className="text-center text-xs opacity-65 pb-8">
        <Link href="/settings/audio" className="underline hover:opacity-100">Direkt zu Audio & Provider</Link>
      </footer>
    </main>
  );
}
