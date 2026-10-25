# AP2 audio asset specifications (files + storage locations)

This list defines **concretely** which audio files are intended for AP2 and where they have to be.
The runtime is resilient: if files are missing, the game keeps running without visible errors.

## Event SFX (short events)
- `public/audio/sfx/correct.mp3`
- `public/audio/sfx/incorrect.mp3`
- `public/audio/sfx/reveal.mp3`
- `public/audio/sfx/win.mp3`
- `public/audio/sfx/lose.mp3`

For every asset the generation prompt lies right next to it as:
- `public/audio/sfx/*.prompt.md`

## Mode recognition cues
- `public/audio/mode-cues/timeline.mp3`
- `public/audio/mode-cues/hint-master.mp3`
- `public/audio/mode-cues/lyrics.mp3`
- `public/audio/mode-cues/vibe-check.mp3`
- `public/audio/mode-cues/survivor.mp3`
- `public/audio/mode-cues/cover-confusion.mp3`

For every asset the generation prompt lies right next to it as:
- `public/audio/mode-cues/*.prompt.md`

## Integration principles
- No always-on loop in addition to the song player.
- Only short one-shots for events.
- Missing or broken assets are ignored silently.
- The normal game flow must never be blocked.
