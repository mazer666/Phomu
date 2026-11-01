'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/art/Icon';

/** Native top-layer dialog: the same iframe stays mounted when opening and hiding. */
export function MusicPlayerDialog({
  revealed,
  onShow,
  onHide,
  provider,
  providerUrl,
  concealed,
  children,
}: {
  revealed: boolean;
  onShow: () => void;
  onHide: () => void;
  provider: string;
  providerUrl?: string;
  concealed: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const wasRevealed = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (revealed && !element.open) element.showModal?.();
    if (!revealed && element.open) element.close?.();
    if (!revealed && wasRevealed.current)
      queueMicrotask(() => {
        element.parentElement
          ?.querySelector<HTMLButtonElement>(
            '.music-swipe-handle,.music-player-expand'
          )
          ?.focus({ preventScroll: true });
      });
    wasRevealed.current = revealed;
  }, [revealed]);
  return (
    <>
      <dialog
        ref={dialog}
        className="music-player-dialog"
        aria-hidden={!revealed}
        inert={!revealed}
        aria-label={t('game.music.playerTitle', { provider })}
        onCancel={(event) => {
          event.preventDefault();
          onHide();
        }}
        onClose={onHide}
      >
        <header className="music-player-dialog-header">
          <span>
            <Icon name="disc" size={22} /> {provider}
          </span>
          <button
            type="button"
            onClick={onHide}
            aria-label={t('game.music.hide')}
          >
            <Icon name="close" size={22} />
          </button>
        </header>
        <div className="music-player-canvas">{children}</div>
        <footer className="music-player-dialog-note">
          <span>{t('game.music.providerControlsHint')}</span>
          {providerUrl && (
            <a href={providerUrl} target="_blank" rel="noopener noreferrer">
              {t('game.music.openAtProvider', { provider })}{' '}
              <Icon name="arrow-right" size={16} />
            </a>
          )}
        </footer>
      </dialog>
      {!revealed && !concealed && (
        <button
          type="button"
          className="music-player-expand"
          onClick={onShow}
          aria-label={t('game.music.openPlayer')}
          title={t('game.music.openPlayer')}
        >
          <Icon name="card" size={20} />{' '}
          <span>{t('game.music.openPlayer')}</span>
        </button>
      )}
    </>
  );
}
