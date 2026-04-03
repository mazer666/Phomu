'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] py-12 px-6 sm:px-10 text-[var(--color-text)]">
      <motion.div 
        className="max-w-4xl mx-auto space-y-12"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <header className="space-y-4 border-b border-[var(--color-border)] pb-8">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[var(--color-primary)]">
            Privacy Notice
          </h1>
          <p className="text-lg font-bold opacity-70">
            Datenschutzhinweise (Stand: April 3, 2026)
          </p>
        </header>

        {/* Section 1: Data Localization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">1. Data Storage & Localization</h2>
            <p className="text-sm leading-relaxed opacity-90">
              Phomu prioritizes data minimization. Most application data, such as game progress, scores, and preferences, is stored **locally on your device** via the browser's <code>localStorage</code>. 
              No user accounts are required, and no persistent personal profiles are created on our servers.
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">1. Datenspeicherung & Lokalisierung</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Phomu legt Wert auf Datenminimierung. Die meisten Anwendungsdaten, wie Spielfortschritte, Spielstände und Einstellungen, werden **lokal auf Ihrem Gerät** über den <code>localStorage</code> des Browsers gespeichert. 
              Es sind keine Benutzerkonten erforderlich, und es werden keine dauerhaften persönlichen Profile auf unseren Servern erstellt.
            </p>
          </section>
        </div>

        {/* Section 2: Technical Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">2. Technical Metadata</h2>
            <p className="text-sm leading-relaxed opacity-90">
              When using features like "Report Missing Link", technical metadata (such as provider name, locale, and song ID) may be transmitted to improve the service. 
              We explicitly **avoid free-text fields** in these flows to prevent accidental transmission of Personally Identifiable Information (PII).
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">2. Technische Metadaten</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Bei der Nutzung von Funktionen wie "Fehlenden Link melden" können technische Metadaten (wie Providername, Gebietsschema und Song-ID) übertragen werden, um den Dienst zu verbessern. 
              Wir **vermeiden ausdrücklich Freitextfelder** in diesen Abläufen, um die versehentliche Übertragung von personenbezogenen Daten (PII) zu verhindern.
            </p>
          </section>
        </div>

        {/* Section 3: Third Party Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">3. Third-Party Services (GDPR/CCPA)</h2>
            <p className="text-sm leading-relaxed opacity-90">
              Phomu integrates official media players from third parties (YouTube IFrame API, Spotify Web Playback, Amazon Music Embeds). 
              By interacting with these players, your data (e.g., IP address, cookies) is subject to the privacy policies of those providers. 
              Phomu does not control or store this interaction data.
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">3. Drittanbieter (DSGVO/CCPA)</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Phomu integriert offizielle Mediaplayer von Drittanbietern (YouTube IFrame API, Spotify Web Playback, Amazon Music Embeds). 
              Durch die Interaktion mit diesen Playern unterliegen Ihre Daten (z. B. IP-Adresse, Cookies) den Datenschutzbestimmungen dieser Anbieter. 
              Phomu kontrolliert oder speichert diese Interaktionsdaten nicht.
            </p>
          </section>
        </div>

        {/* Section 4: Your Rights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">4. Your Rights & Control</h2>
            <p className="text-sm leading-relaxed opacity-90">
              Under GDPR (Art. 15-21) and CCPA, you have the right to access, rectify, or delete your data. 
              Since Phomu stores data locally, you can exercise these rights at any time by **clearing your browser's site data/cache**. 
              This will permanently remove all game-related information from your device.
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">4. Ihre Rechte & Kontrolle</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Gemäß DSGVO (Art. 15-21) und CCPA haben Sie das Recht auf Auskunft, Berichtigung oder Löschung Ihrer Daten. 
              Da Phomu Daten lokal speichert, können Sie diese Rechte jederzeit ausüben, indem Sie die **Webseitendaten/Cache Ihres Browsers löschen**. 
              Dadurch werden alle spielbezogenen Informationen dauerhaft von Ihrem Gerät entfernt.
            </p>
          </section>
        </div>

        {/* Section 5: Inquiries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">5. Inquiries & Contact</h2>
            <p className="text-sm leading-relaxed opacity-90">
              For any privacy-related questions or inquiries, please contact the project maintainers via the official GitHub repository. 
              We use GitHub Issues as a transparent communication channel for technical and legal feedback.
              <br />
              <Link href="https://github.com/mazer666/Phomu" className="underline font-bold hover:text-[var(--color-primary)]">
                github.com/mazer666/Phomu
              </Link>
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">5. Anfragen & Kontakt</h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              Bei datenschutzbezogenen Fragen oder Anliegen wenden Sie sich bitte über das offizielle GitHub-Repository an die Projektverantwortlichen. 
              Wir nutzen GitHub Issues als transparenten Kommunikationskanal für technisches und rechtliches Feedback.
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
            Phomu // Privacy Shield v1.2
          </p>
        </footer>
      </motion.div>
    </main>
  );
}
