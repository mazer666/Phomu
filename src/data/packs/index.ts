/**
 * Song Pack Loader
 * 
 * Aggregates all JSON song packs into a single source of truth.
 * This makes it easy to expand to 1000+ songs across multiple files.
 */

import globalHits from './global-hits.json';
import eightyFlashback from './80s-flashback.json';
import movieHits from './movie-hits.json';
import rockAnthems from './rock-anthems.json';
import ninetyUnplugged from './90s-unplugged.json';
import danceFloorFillers from './dance-floor-fillers.json';
import germanClassics from './german-classics.json';
import hipHopEssentials from './hip-hop-essentials.json';
import indieAlternative from './indie-alternative.json';
import electronicTechno from './electronic-techno.json';
import schlagerEvergreens from './schlager-evergreens.json';
import countryJazzBlues from './country-jazz-blues.json';
import worldReggaeSoul from './world-reggae-soul.json';
import sixtySeventyLegends from './60s-70s-legends.json';
import popRnB2000s from './2000s-pop-rnb.json';
import hits2010s2020s from './2010s-2020s-hits.json';
import pop80s from './80s-pop.json';
import kidsDisney from './kids-disney.json';
import jazzBlues from './jazz-blues.json';
import metalHardcore from './metal-hardcore.json';
import countryFolk from './country-folk.json';
import pianoBallads from './piano-ballads.json';
import electronicSynth from './electronic-synth.json';
import soulFunk from './soul-funk.json';
import classicalOrchestral from './classical-orchestral.json';
import grandFinale from './grand-finale.json';
import youtubeImport from './youtube-import.json';

import type { PhomuSong } from '@/types/song';

type SongPackFile = { songs: unknown[] };

const ALL_PACK_FILES: SongPackFile[] = [
  globalHits,
  eightyFlashback,
  movieHits,
  rockAnthems,
  ninetyUnplugged,
  danceFloorFillers,
  germanClassics,
  hipHopEssentials,
  indieAlternative,
  electronicTechno,
  schlagerEvergreens,
  countryJazzBlues,
  worldReggaeSoul,
  sixtySeventyLegends,
  popRnB2000s,
  hits2010s2020s,
  pop80s,
  kidsDisney,
  jazzBlues,
  metalHardcore,
  countryFolk,
  pianoBallads,
  electronicSynth,
  soulFunk,
  classicalOrchestral,
  grandFinale,
  youtubeImport,
];

/** All songs from all packs combined */
export const ALL_SONGS: PhomuSong[] = ALL_PACK_FILES.flatMap((pack) => pack.songs) as PhomuSong[];

/** All available pack names extracted from data */
export const AVAILABLE_PACKS: string[] = Array.from(new Set(ALL_SONGS.map(s => s.pack)));

/** Helper to get songs for specific packs */
export function getSongsForPacks(packNames: string[]): PhomuSong[] {
  return ALL_SONGS.filter(s => packNames.includes(s.pack));
}
