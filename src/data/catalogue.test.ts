import { describe, expect, it } from 'vitest';

import {
  listPacks,
  loadAdminRecords,
  loadCatalogue,
  loadPack,
  loadSong,
} from '@/data/catalogue';

describe('the narrow interface of the catalogue', () => {
  it('lists the packs of the catalogue', () => {
    const packs = listPacks();
    expect(packs.length).toBeGreaterThan(0);
    expect([...packs].sort()).toEqual(packs);
  });

  it('projects the metadata without a hint and without a lyric', async () => {
    const entries = await loadCatalogue();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual(['artist', 'id', 'title', 'year']);
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.title).toBe('string');
      expect(typeof entry.artist).toBe('string');
      expect(typeof entry.year).toBe('number');
    }
  });

  it('returns the songs of one pack', async () => {
    const packs = listPacks();
    const pack = packs[0];
    const bundles = await loadPack(pack);
    expect(bundles.length).toBeGreaterThan(0);
    for (const bundle of bundles) {
      expect(bundle.entry.id.length).toBeGreaterThan(0);
      expect(bundle.hints.length).toBe(5);
    }
  });

  it('resolves a legacy identifier of a pack', async () => {
    const bundles = await loadPack('global-hits');
    expect(bundles.length).toBeGreaterThan(0);
  });

  it('returns an empty pack for an unknown identifier', async () => {
    const bundles = await loadPack('a-pack-that-does-not-exist');
    expect(bundles).toEqual([]);
  });

  it('returns the bundle of one song and undefined for an unknown song', async () => {
    const entries = await loadCatalogue();
    const first = entries[0];
    const bundle = await loadSong(first.id);
    expect(bundle).toBeDefined();
    expect(bundle?.entry).toEqual(first);
    expect(await loadSong('a-song-that-does-not-exist')).toBeUndefined();
  });

  it('never carries the invented lyric line in a bundle', async () => {
    const records = await loadAdminRecords();
    const withLyrics = records.filter((song) => song.lyrics !== null);
    expect(withLyrics.length).toBeGreaterThan(0);
    for (const song of withLyrics) {
      const bundle = await loadSong(song.id);
      const fake = typeof song.lyrics?.fake === 'string'
        ? [song.lyrics.fake]
        : (song.lyrics?.fake ?? []);
      for (const line of fake) {
        expect(bundle?.lyrics ?? []).not.toContain(line);
      }
    }
  });
});
