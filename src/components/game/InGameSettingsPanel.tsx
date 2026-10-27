/**
 * The modal of the in-game settings.
 *
 * WHAT: the frame of the in-game settings as a modal over the game.
 *
 * WHY the panels live in `InGameSettingsContent`: in the landscape the
 * settings stand in the side column instead of over the game. Both use the
 * same panels.
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { InGameSettingsContent } from './InGameSettingsContent';

interface InGameSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveParty: () => void;
  onOpenFullSettings: () => void;
}

export function InGameSettingsPanel({
  isOpen,
  onClose,
  onLeaveParty,
  onOpenFullSettings,
}: InGameSettingsPanelProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111217] text-white p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black uppercase tracking-wider">
                {t('game.settings.title')}
              </h2>
              <button
                onClick={onClose}
                className="text-xl opacity-50 hover:opacity-100"
                aria-label={t('game.settings.closeAriaLabel')}
              >
                ✕
              </button>
            </div>

            <InGameSettingsContent
              onClose={onClose}
              onLeaveParty={onLeaveParty}
              onOpenFullSettings={onOpenFullSettings}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
