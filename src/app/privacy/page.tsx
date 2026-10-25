'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/** Date of the privacy notice. */
const LAST_UPDATED = new Date('2026-04-03T12:00:00Z');

/** Allows **bold** and `code` markup in translation texts. */
const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/**
 * Renders a translation text with simple markup:
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

export default function PrivacyPage() {
  const { t, i18n } = useTranslation();

  // The legal page is deliberately bilingual: the active language comes first.
  const date = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'long',
  }).format(LAST_UPDATED);

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
            {t('legal.privacy.title')}
          </h1>
          <p className="text-lg font-bold opacity-70">
            {t('legal.privacy.subtitle', { date })}
          </p>
        </header>

        {/* Section 1: Data Localization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.privacy.section1.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.privacy.section1.body'))}
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.privacy.section1.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.privacy.section1.bodyAlt'))}
            </p>
          </section>
        </div>

        {/* Section 2: Technical Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.privacy.section2.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.privacy.section2.body'))}
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.privacy.section2.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.privacy.section2.bodyAlt'))}
            </p>
          </section>
        </div>

        {/* Section 3: Third Party Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.privacy.section3.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.privacy.section3.body'))}
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.privacy.section3.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.privacy.section3.bodyAlt'))}
            </p>
          </section>
        </div>

        {/* Section 4: Your Rights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.privacy.section4.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.privacy.section4.body'))}
            </p>
          </section>
          <section className="space-y-3 border-l-0 md:border-l border-[var(--color-border)] md:pl-8">
            <h2 className="text-xl font-black uppercase tracking-wider opacity-60">
              {t('legal.privacy.section4.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.privacy.section4.bodyAlt'))}
            </p>
          </section>
        </div>

        {/* Section 5: Inquiries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--color-accent)]">
              {t('legal.privacy.section5.title')}
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              {renderInline(t('legal.privacy.section5.body'))}
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
              {t('legal.privacy.section5.titleAlt')}
            </h2>
            <p className="text-sm leading-relaxed opacity-70 italic">
              {renderInline(t('legal.privacy.section5.bodyAlt'))}
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
            {t('legal.footer.privacyVersion')}
          </p>
        </footer>
      </motion.div>
    </main>
  );
}
