'use client';

/**
 * Landing Page
 *
 * The first thing users see when they open Phomu.
 * Shows the Phomu branding, language/theme switchers,
 * and the two main entry points: Quick Start and Customize.
 */
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Hero section with animated entrance */}
      <motion.div
        className="flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo / Title */}
        <h1
          className="text-7xl font-black tracking-tight sm:text-8xl"
          style={{ color: 'var(--color-primary)' }}
        >
          {t('app.title')}
        </h1>
        <p
          className="mt-3 text-lg sm:text-xl"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('app.subtitle')}
        </p>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="mt-12 flex flex-col gap-4 sm:flex-row sm:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      >
        {/* Quick Start button */}
        <button
          onClick={() => router.push('/lobby')}
          className="group relative min-w-[220px] cursor-pointer rounded-xl px-8 py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <span className="block text-xl">{t('landing.quickStart')}</span>
          <span className="block text-sm font-normal opacity-80">
            {t('landing.quickStartDesc')}
          </span>
        </button>

        {/* Customize button */}
        <button
          onClick={() => router.push('/lobby')}
          className="group relative min-w-[220px] cursor-pointer rounded-xl px-8 py-4 text-lg font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text)',
            border: '2px solid var(--color-border)',
          }}
        >
          <span className="block text-xl">{t('landing.customize')}</span>
          <span
            className="block text-sm font-normal"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('landing.customizeDesc')}
          </span>
        </button>
      </motion.div>

      {/* Footer hint */}
      <motion.div
        className="mt-16 text-sm text-center space-y-2"
        style={{ color: 'var(--color-text-secondary)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <p>GPL-3.0 &middot; Open Source &middot; Made with music</p>
        <p className="flex items-center justify-center gap-3 text-xs">
          <Link href="/guide" className="underline hover:opacity-100 opacity-80">Spielhilfe</Link>
          <span>&middot;</span>
          <Link href="/privacy" className="underline hover:opacity-100 opacity-80">Privacy Notice</Link>
          <span>&middot;</span>
          <Link href="/terms" className="underline hover:opacity-100 opacity-80">Terms of Service</Link>
        </p>
      </motion.div>
    </main>
  );
}
