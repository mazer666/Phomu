'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongIdentity } from '@/core/types';
import { CardBack } from '@/components/art/CardBack';
import { Icon } from '@/components/art/Icon';
import { describeTimelineSlot, isTimelineSlotCorrect } from './timeline-logic';

export type TimelineAxis = 'vertical' | 'horizontal';
interface TimelineSlotsProps {
  timelineYears: number[];
  selectedSlot: number | null;
  jokerSlot: number | null;
  correctSlot: number | null;
  validSlotSet: ReadonlySet<number>;
  isRevealed: boolean;
  hasAnswer: boolean;
  identity: SongIdentity | null;
  axis?: TimelineAxis;
  onSelect: (slot: number) => void;
}

/** A movable card table. Only the rail scrolls; controls and the answer stay in view. */
export function TimelineSlots({
  timelineYears,
  selectedSlot,
  jokerSlot,
  correctSlot,
  validSlotSet,
  isRevealed,
  hasAnswer,
  identity,
  axis = 'horizontal',
  onSelect,
}: TimelineSlotsProps) {
  const { t } = useTranslation();
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ before: false, after: false });
  const drag = useRef<{ x: number; left: number } | null>(null);
  const moved = useRef(false);
  const answerCorrect = isTimelineSlotCorrect(selectedSlot, validSlotSet);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () =>
      setEdges({
        before: element.scrollLeft > 4,
        after:
          element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
      });
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    return () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [timelineYears.length]);

  useEffect(() => {
    if (selectedSlot === null) return;
    rail.current
      ?.querySelector<HTMLElement>(`[data-slot="${selectedSlot}"]`)
      ?.scrollIntoView?.({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
  }, [selectedSlot]);

  function move(direction: number) {
    rail.current?.scrollBy({
      left: direction * rail.current.clientWidth * 0.7,
      behavior: 'smooth',
    });
  }

  return (
    <section
      className="timeline-table"
      data-axis={axis}
      aria-label={t('modes.timeline.boardLabel')}
    >
      <div className="timeline-table-toolbar">
        <span>
          <Icon name="card" size={18} /> {t('modes.timeline.tableHint')}
        </span>
        <span className="timeline-navigation">
          <button
            type="button"
            aria-label={t('modes.timeline.earlier')}
            disabled={!edges.before}
            onClick={() => move(-1)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label={t('modes.timeline.later')}
            disabled={!edges.after}
            onClick={() => move(1)}
          >
            →
          </button>
        </span>
      </div>
      <div
        className="timeline-rail-shell"
        data-before={edges.before}
        data-after={edges.after}
      >
        <div
          className="timeline-rail"
          ref={rail}
          tabIndex={0}
          aria-label={t('modes.timeline.swipeHint')}
          onPointerDown={(event) => {
            moved.current = false;
            if (event.pointerType === 'mouse')
              drag.current = {
                x: event.clientX,
                left: event.currentTarget.scrollLeft,
              };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const distance = event.clientX - drag.current.x;
            if (Math.abs(distance) > 6) moved.current = true;
            if (moved.current)
              event.currentTarget.scrollLeft = drag.current.left - distance;
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerLeave={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onClickCapture={(event) => {
            if (moved.current) {
              event.preventDefault();
              event.stopPropagation();
              moved.current = false;
            }
          }}
        >
          <div className="timeline-cards">
            {Array.from({ length: timelineYears.length + 1 }, (_, index) => {
              const slot = describeTimelineSlot({
                index,
                selectedSlot,
                jokerSlot,
                correctSlot,
                isAnswerCorrect: answerCorrect,
                isRevealed,
                hasAnswer,
                yearAfter: timelineYears[index],
              });
              const placed = ['placed', 'correct', 'wrong'].includes(slot.kind);
              const judged =
                hasAnswer && (slot.kind === 'correct' || slot.kind === 'wrong');
              return (
                <Fragment key={index}>
                  <button
                    type="button"
                    data-slot={index}
                    data-kind={slot.kind}
                    className={`timeline-placement ${placed ? 'has-card' : ''}`}
                    aria-pressed={selectedSlot === index}
                    aria-label={t('modes.timeline.slotLabel', {
                      position: index + 1,
                      before:
                        timelineYears[index - 1] ??
                        t('modes.timeline.beginning'),
                      after: timelineYears[index] ?? t('modes.timeline.end'),
                    })}
                    disabled={isRevealed || slot.kind === 'joker'}
                    onClick={() => onSelect(index)}
                  >
                    {judged ? (
                      <span className="timeline-answer-card">
                        <Icon
                          name={slot.kind === 'correct' ? 'check' : 'close'}
                          size={22}
                        />
                        <strong>{identity?.year}</strong>
                        <span>{identity?.artist}</span>
                        <span>{identity?.title}</span>
                      </span>
                    ) : placed ? (
                      <>
                        <CardBack />
                        <span className="timeline-placement-caption">
                          {t('modes.timeline.placed')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Icon
                          name={slot.kind === 'joker' ? 'ban' : 'plus'}
                          size={22}
                        />
                        <span>{index + 1}</span>
                        {slot.kind === 'hint' && (
                          <span>{t('modes.timeline.here')}</span>
                        )}
                      </>
                    )}
                  </button>
                  {timelineYears[index] !== undefined && (
                    <div className="timeline-year-card">
                      <Icon name="disc" size={26} />
                      <strong>{timelineYears[index]}</strong>
                      <span>PHOMU</span>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
      <p className="timeline-swipe-hint">
        {edges.before || edges.after
          ? t('modes.timeline.swipeHint')
          : t('modes.timeline.chooseHint')}
      </p>
    </section>
  );
}
