'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] py-12 px-6 sm:px-10">
      <motion.div 
        className="max-w-4xl mx-auto space-y-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <header className="space-y-4 border-b border-[var(--color-border)] pb-8">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[var(--color-primary)]">
            Terms of Service
          </h1>
          <p className="text-lg font-bold opacity-70">
            Nutzungsbedingungen (Stand: April 3, 2026)
          </p>
        </header>

        {/* Section 1: Introduction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">1. Service Description</h2>
            <p className="text-sm leading-relaxed opacity-90">
              Phomu is an open-source technical platform designed as a web-based interface for music-related quiz games. 
              The platform acts solely as a technical bridge between users and third-party media providers.
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">1. Leistungsbeschreibung</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Phomu ist eine Open-Source-Plattform, die als webbasierte Schnittstelle für Musik-Quizspiele konzipiert ist. 
              Die Plattform fungiert ausschließlich als technische Brücke zwischen Nutzern und Drittanbietern.
            </p>
          </section>
        </div>

        {/* Section 2: Content Provision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">2. No Content Provision</h2>
            <p className="text-sm leading-relaxed opacity-90">
              Phomu does <strong>not</strong> host, provide, or distribute any music files or media content. 
              All playback is handled via official embeds from third-party services like YouTube, Spotify, and Amazon Music. 
              Availability depends on the policies of these respective providers.
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">2. Keine Bereitstellung von Inhalten</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Phomu hostet, stellt bereit oder verbreitet <strong>keine</strong> Musikdateien oder Medieninhalte. 
              Die Wiedergabe erfolgt ausschließlich über offizielle Embeds von Drittanbietern wie YouTube, Spotify und Amazon Music. 
              Die Verfügbarkeit hängt von den Richtlinien dieser Anbieter ab.
            </p>
          </section>
        </div>

        {/* Section 3: Fair Use Declaration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">3. Fair Use Principle</h2>
            <p className="text-sm leading-relaxed opacity-90">
              Phomu is intended for personal, non-commercial use within a private or educational context (e.g., party games or knowledge-based quizzes). 
              Usage of third-party snippets is framed under the principle of **Fair Use**, allowing for transformative use of media for commentary and gameplay purposes.
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">3. Fair-Use-Prinzip</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Phomu ist für die persönliche, nichtkommerzielle Nutzung im privaten oder pädagogischen Kontext (z. B. Party-Spiele oder Wissens-Quizzes) gedacht. 
              Die Nutzung von Ausschnitten durch Drittanbieter erfolgt im Rahmen des **Fair-Use-Prinzips**, das eine transformative Nutzung für Kommentar- und Spielzwecke erlaubt.
            </p>
          </section>
        </div>

        {/* Section 4: Liability Disclaimer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">4. Liability Disclaimer</h2>
            <p className="text-sm leading-relaxed opacity-90">
              The software is provided "as is", without warranty of any kind. 
              In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use of the platform. 
              Users are responsible for their own interaction with third-party APIs.
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">4. Haftungsausschluss</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Die Software wird "wie besehen" zur Verfügung gestellt, ohne jegliche Gewährleistung. 
              In keinem Fall sind die Autoren oder Urheberrechtsinhaber für Ansprüche, Schäden oder sonstige Haftung haftbar, die sich aus der Nutzung der Plattform ergeben. 
              Nutzer sind für ihre eigene Interaktion mit Drittanbieter-APIs verantwortlich.
            </p>
          </section>
        </div>

        {/* Section 5: License & GitHub */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">5. Open Source & License</h2>
            <p className="text-sm leading-relaxed opacity-90">
              Phomu is licensed under the **GNU General Public License v3.0**. 
              The full source code is available for audit and contribution on GitHub: 
              <br />
              <Link href="https://github.com/mazer666/Phomu" className="underline font-bold hover:text-[var(--color-primary)]">
                github.com/mazer666/Phomu
              </Link>
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">5. Open Source & Lizenz</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Phomu steht unter der **GNU General Public License v3.0**. 
              Der vollständige Quellcode ist auf GitHub für Audits und Beiträge verfügbar:
              <br />
              <Link href="https://github.com/mazer666/Phomu" className="underline font-bold hover:text-[var(--color-primary)]">
                github.com/mazer666/Phomu
              </Link>
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <footer className="pt-12 flex items-center justify-between border-t border-[var(--color-border)]">
          <Link href="/" className="text-sm font-bold opacity-60 hover:opacity-100 hover:text-[var(--color-primary)] transition-all">
            ← Back to Home / Zurück
          </Link>
          <p className="text-xs opacity-40 font-mono">
            Phomu // Legal Framework v1.2
          </p>
        </footer>
      </motion.div>
    </main>
  );
}
