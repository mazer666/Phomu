/** Phomu's theme-aware record sleeve: a reusable, spoiler-free card back. */
export function CardBack({ className = '' }: { className?: string }) {
  return (
    <span className={`phomu-card-back ${className}`} aria-hidden="true">
      <svg viewBox="0 0 120 160" fill="none" focusable="false">
        <rect
          x="5"
          y="5"
          width="110"
          height="150"
          rx="14"
          stroke="currentColor"
          opacity=".5"
        />
        <path
          d="M14 35 47 14M73 146l33-21M14 125l33 21M73 14l33 21"
          stroke="currentColor"
          opacity=".3"
        />
        <circle cx="60" cy="70" r="35" stroke="currentColor" strokeWidth="2" />
        <circle cx="60" cy="70" r="29" stroke="currentColor" opacity=".4" />
        <circle cx="60" cy="70" r="23" stroke="currentColor" opacity=".3" />
        <circle cx="60" cy="70" r="13" fill="currentColor" />
        <circle cx="60" cy="70" r="3" fill="var(--color-bg-card)" />
        <path
          d="M27 120v-9m8 14v-19m8 14v-9m34 9v-9m8 14v-19m8 14v-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="phomu-card-wordmark">PHOMU</span>
    </span>
  );
}
