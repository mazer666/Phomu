'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/art/Icon';
import { ModeArt } from '@/components/art/ModeArt';

const MODE_CARDS = [
  {
    id: 'timeline', mode: 'timeline' as const,
    nameKey: 'guide.mode.timelineName',
    visualKey: 'guide.mode.timelineVisual',
    textKey: 'guide.mode.timelineText',
  },
  {
    id: 'hintMaster', mode: 'hint-master' as const,
    nameKey: 'guide.mode.hintMasterName',
    visualKey: 'guide.mode.hintMasterVisual',
    textKey: 'guide.mode.hintMasterText',
  },
  {
    id: 'lyrics', mode: 'lyrics' as const,
    nameKey: 'guide.mode.lyricsName',
    visualKey: 'guide.mode.lyricsVisual',
    textKey: 'guide.mode.lyricsText',
  },
  {
    id: 'vibeCheck', mode: 'vibe-check' as const,
    nameKey: 'guide.mode.vibeCheckName',
    visualKey: 'guide.mode.vibeCheckVisual',
    textKey: 'guide.mode.vibeCheckText',
  },
  {
    id: 'survivor', mode: 'survivor' as const,
    nameKey: 'guide.mode.survivorName',
    visualKey: 'guide.mode.survivorVisual',
    textKey: 'guide.mode.survivorText',
  },
  {
    id: 'coverConfusion', mode: 'cover-confusion' as const,
    nameKey: 'guide.mode.coverConfusionName',
    visualKey: 'guide.mode.coverConfusionVisual',
    textKey: 'guide.mode.coverConfusionText',
  },
] as const;

const QUICK_FLOW = [
  {
    step: '1',
    titleKey: 'guide.flow.step1Title',
    textKey: 'guide.flow.step1Text',
  },
  {
    step: '2',
    titleKey: 'guide.flow.step2Title',
    textKey: 'guide.flow.step2Text',
  },
  {
    step: '3',
    titleKey: 'guide.flow.step3Title',
    textKey: 'guide.flow.step3Text',
  },
  {
    step: '4',
    titleKey: 'guide.flow.step4Title',
    textKey: 'guide.flow.step4Text',
  },
] as const;

export default function GuidePage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <main className="flex-1 min-h-0 overflow-y-auto max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/15 via-orange-400/10 to-cyan-400/10 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">
              <Icon name="compass" size={22} className="text-[var(--color-accent)]" /> {t('guide.title')}
            </h1>
            <p className="mt-2 text-sm md:text-base opacity-85 max-w-2xl">
              {t('guide.intro')}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-xs font-black uppercase tracking-wider"
          >
            {t('common.back')}
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
            <p className="text-xs uppercase font-black tracking-widest opacity-60">
              {t('guide.stepLabel', { step: item.step })}
            </p>
            <h2 className="text-lg font-black mt-1">{t(item.titleKey)}</h2>
            <p className="text-sm opacity-80 mt-1">{t(item.textKey)}</p>
          </motion.div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black"><Icon name="controller" size={20} className="text-[var(--color-accent)]" /> {t('guide.modesOverview')}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODE_CARDS.map((mode, idx) => (
            <motion.article
              key={mode.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black">{t(mode.nameKey)}</h3>
                <ModeArt mode={mode.mode} size={30} />
              </div>
              <p className="font-mono text-xs mt-3 px-2 py-1 rounded-lg bg-black/30 inline-block">
                {t(mode.visualKey)}
              </p>
              <p className="text-sm opacity-80 mt-2">{t(mode.textKey)}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-black mb-2">
          ⚙ {t('guide.selectionHelpTitle')}
        </h2>
        <ul className="grid md:grid-cols-2 gap-2 text-sm">
          <li>
            • <strong>{t('guide.tips.newcomersLabel')}</strong>{' '}
            {t('guide.tips.newcomers')}
          </li>
          <li>
            • <strong>{t('guide.tips.partyModeLabel')}</strong>{' '}
            {t('guide.tips.partyMode', { count: 3 })}
          </li>
          <li>
            • <strong>{t('guide.tips.trickyLabel')}</strong>{' '}
            {t('guide.tips.tricky')}
          </li>
          <li>
            • <strong>{t('guide.tips.quickRoundLabel')}</strong>{' '}
            {t('guide.tips.quickRound')}
          </li>
        </ul>
      </section>

      <footer className="text-center text-xs opacity-65 pb-8">
        <Link href="/settings/audio" className="underline hover:opacity-100">
          {t('guide.audioLink')}
        </Link>
      </footer>
    </main>
  );
}
