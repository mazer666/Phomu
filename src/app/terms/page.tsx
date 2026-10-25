'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/** Stand der Nutzungsbedingungen */
const LAST_UPDATED = new Date('2026-04-03T12:00:00Z');

/** Erlaubt **fette** und `code`-Auszeichnung in Übersetzungstexten */
const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/**
 * Rendert einen Übersetzungstext mit einfacher Auszeichnung:
 * **Text** → <strong>, `Text` → <code>
 */
function renderInline(text: string): ReactNode[] {
  return text
    .split(INLINE_PATTERN)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}

export default function TermsPage() {
  const { t, i18n } = useTranslation();

  // Die Legal-Seite ist bewusst zweisprachig: die aktive Sprache steht vorn.
  const date = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'long',
  }).format(LAST_UPDATED);

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
            {t('legal.terms.title')}
          </h1>
          <p className="text-lg font-bold opacity-70">
            {t('legal.terms.subtitle', { date })}
          </p>
        </header>

        {/* Section 1: Introduction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.terms.section1.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.terms.section1.body'))}
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.terms.section1.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.terms.section1.bodyAlt'))}
            </p>
          </section>
        </div>

        {/* Section 2: Content Provision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.terms.section2.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.terms.section2.body'))}
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.terms.section2.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.terms.section2.bodyAlt'))}
            </p>
          </section>
        </div>

        {/* Section 3: Fair Use Declaration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.terms.section3.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.terms.section3.body'))}
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.terms.section3.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.terms.section3.bodyAlt'))}
            </p>
          </section>
        </div>

        {/* Section 4: Liability Disclaimer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.terms.section4.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.terms.section4.body'))}
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.terms.section4.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.terms.section4.bodyAlt'))}
            </p>
          </section>
        </div>

        {/* Section 5: License & GitHub */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.terms.section5.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.terms.section5.body'))}
              <br />
              <Link
                href="https://github.com/mazer666/Phomu"
                className="underline font-bold hover:text-[var(--color-primary)]"
              >
                {t('legal.footer.repoLabel')}
              </Link>
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.terms.section5.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.terms.section5.bodyAlt'))}
              <br />
              <Link
                href="https://github.com/mazer666/Phomu"
                className="underline font-bold hover:text-[var(--color-primary)]"
              >
                {t('legal.footer.repoLabel')}
              </Link>
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <footer className="pt-12 flex items-center justify-between border-t border-[var(--color-border)]">
          <Link
            href="/"
            className="text-sm font-bold opacity-60 hover:opacity-100 hover:text-[var(--color-primary)] transition-all"
          >
            {t('legal.footer.backHome')}
          </Link>
          <p className="text-xs opacity-40 font-mono">
            {t('legal.footer.legalVersion')}
          </p>
        </footer>
      </motion.div>
    </main>
  );
}
