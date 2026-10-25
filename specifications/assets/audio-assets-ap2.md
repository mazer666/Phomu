# AP2 Audio-Asset Vorgaben (Dateien + Ablageorte)

Diese Liste definiert **konkret**, welche Audio-Dateien für AP2 vorgesehen sind und wo sie liegen müssen.
Die Runtime ist resilient: Wenn Dateien fehlen, läuft das Spiel ohne sichtbare Fehler weiter.

## Event-SFX (kurze Ereignisse)
- `public/audio/sfx/correct.mp3`
- `public/audio/sfx/incorrect.mp3`
- `public/audio/sfx/reveal.mp3`
- `public/audio/sfx/win.mp3`
- `public/audio/sfx/lose.mp3`

Zu jedem Asset liegt der Generierungs-Prompt direkt daneben als:
- `public/audio/sfx/*.prompt.md`

## Modus-Erkennungs-Cues
- `public/audio/mode-cues/timeline.mp3`
- `public/audio/mode-cues/hint-master.mp3`
- `public/audio/mode-cues/lyrics.mp3`
- `public/audio/mode-cues/vibe-check.mp3`
- `public/audio/mode-cues/survivor.mp3`
- `public/audio/mode-cues/cover-confusion.mp3`

Zu jedem Asset liegt der Generierungs-Prompt direkt daneben als:
- `public/audio/mode-cues/*.prompt.md`

## Integrationsprinzipien
- Kein Always-on-Loop zusätzlich zum Songplayer.
- Nur kurze Einzelsounds (One-shots) für Events.
- Fehlende/defekte Assets werden still ignoriert.
- Der normale Spielfluss darf nie blockiert werden.
