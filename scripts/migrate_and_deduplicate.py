import json
import os
import glob
import re
from collections import defaultdict

def normalize_field_names(song):
    """Maps legacy field names (snake_case) to PhomuSong camelCase."""
    mappings = {
        'isOne_hit_wonder': 'isOneHitWonder',
        'isonehitwonder': 'isOneHitWonder',
    }
    for old, new in mappings.items():
        if old in song and new not in song:
            song[new] = song.pop(old)
    return song

def normalize(text):
    if not text:
        return ""
    # Lowercase, trim, and remove multiple spaces
    return " ".join(text.lower().strip().split())

MAX_SONGS_PER_FILE = 100

def get_artist_letter(artist):
    if not artist:
        return "others"
    first_char = artist.strip()[0].upper()
    if first_char.isalpha():
        return first_char
    if first_char.isdigit():
        return "numbers"
    return "others"

def merge_songs(existing, new_song, pack_name):
    """Merges new_song into existing song record."""
    # Add pack if not already there
    if 'packs' not in existing:
        # Migrate 'pack' string to 'packs' array if it's the first time
        old_pack = existing.get('pack')
        existing['packs'] = [old_pack] if old_pack else []
    
    if pack_name and pack_name not in existing['packs']:
        existing['packs'].append(pack_name)
    
    # Merge links - prefer the more complete ones
    if 'links' not in existing:
        existing['links'] = {}
    
    new_links = new_song.get('links', {})
    for key, val in new_links.items():
        if val and (not existing['links'].get(key) or len(str(val)) > len(str(existing['links'].get(key, "")))):
            existing['links'][key] = val
            
    # Merge moods
    existing_moods = set(existing.get('mood', []))
    new_moods = set(new_song.get('mood', []))
    existing['mood'] = sorted(list(existing_moods.union(new_moods)))
    
    # Merge supportedModes
    existing_modes = set(existing.get('supportedModes', []))
    new_modes = set(new_song.get('supportedModes', []))
    existing['supportedModes'] = sorted(list(existing_modes.union(new_modes)))
    
    # Hints: prefer longer/more detailed hints if they differ
    if 'hints' in new_song and len(new_song['hints']) == 5:
        if 'hints' not in existing or len("".join(new_song['hints'])) > len("".join(existing.get('hints', []))):
            existing['hints'] = new_song['hints']

    # Year: prefer earliest
    new_year = new_song.get('year')
    if new_year and (not existing.get('year') or new_year < existing['year']):
        existing['year'] = new_year

    # Other metadata: keep if missing
    for key in ['country', 'genre', 'difficulty', 'isOneHitWonder', 'isQRCompatible', 'coverUrl', 'lyrics', 'coverMode', 'previewTimestamp', 'hintEvidence']:
        if key in new_song and (not existing.get(key) or (key == 'lyrics' and new_song[key] is not None and existing.get(key) is None)):
            existing[key] = new_song[key]
            
    return existing

def migrate():
    source_dir = 'src/data/packs'
    target_dir = 'src/data/songs'
    os.makedirs(target_dir, exist_ok=True)

    all_songs = {} # (normalized_artist, normalized_title) -> song_object
    pack_metadata = {}

    # 1. Read all packs
    pack_files = glob.glob(os.path.join(source_dir, '*.json'))
    print(f"Found {len(pack_files)} pack files.")

    for pack_file in pack_files:
        with open(pack_file, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except Exception as e:
                print(f"Error reading {pack_file}: {e}")
                continue
            
            meta = data.get('meta', {})
            pack_name = meta.get('pack', os.path.basename(pack_file).replace('.json', ''))
            pack_metadata[pack_name] = meta
            
            songs_in_pack = data.get('songs', [])
            print(f"Processing pack '{pack_name}' ({len(songs_in_pack)} songs)...")
            
            for s in songs_in_pack:
                s = normalize_field_names(s)
                # Ensure artist and title exist
                artist = s.get('artist', 'Unknown Artist')
                title = s.get('title', 'Unknown Title')
                key = (normalize(artist), normalize(title))
                
                if key in all_songs:
                    all_songs[key] = merge_songs(all_songs[key], s, pack_name)
                else:
                    # Initialize new song record with 'packs' instead of 'pack'
                    new_s = s.copy()
                    if 'pack' in new_s:
                        new_s['packs'] = [new_s.pop('pack')]
                    else:
                        new_s['packs'] = [pack_name]
                    all_songs[key] = new_s

    print(f"Total unique songs after deduplication: {len(all_songs)}")

    # 2. Partition by artist initial
    partitions = defaultdict(list)
    for s in all_songs.values():
        letter = get_artist_letter(s.get('artist'))
        partitions[letter].append(s)

    # 3. Write partitioned files and collect for index
    generated_files = []
    for letter, songs in partitions.items():
        # Sort songs by artist then title
        sorted_songs = sorted(songs, key=lambda x: (normalize(x.get('artist', '')), normalize(x.get('title', ''))))
        
        # Split if too many
        chunks = [sorted_songs[i:i + MAX_SONGS_PER_FILE] for i in range(0, len(sorted_songs), MAX_SONGS_PER_FILE)]
        
        for idx, chunk in enumerate(chunks):
            suffix = str(idx + 1) if len(chunks) > 1 else ""
            base_name = f"{letter.upper() if letter.isalpha() else letter}{suffix}"
            file_name = f"{base_name}.json"
            output_file = os.path.join(target_dir, file_name)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({"songs": chunk}, f, indent=2, ensure_ascii=False)
            print(f"Wrote {len(chunk)} songs to {output_file}")
            generated_files.append(base_name)

    # 4. Write pack metadata
    with open(os.path.join(target_dir, 'packs.json'), 'w', encoding='utf-8') as f:
        json.dump(pack_metadata, f, indent=2, ensure_ascii=False)
    print(f"Wrote pack metadata to {os.path.join(target_dir, 'packs.json')}")

    # 5. Generate index.ts
    index_content = [
        "/**",
        " * Unified Song Loader (Auto-generated)",
        " * ",
        " * This file is generated by scripts/migrate_and_deduplicate.py.",
        " * Do not edit it manually.",
        " */",
        "",
        "import type { PhomuSong } from '@/types/song';",
        "import packMetadata from './packs.json';",
        ""
    ]
    
    # Imports
    for base in sorted(generated_files):
        var_name = base if base[0].isalpha() else f"NUM_{base}"
        # Handle Ñ and other special chars for var names
        var_name = var_name.replace('Ñ', 'ENNE')
        index_content.append(f"import {var_name} from './{base}.json';")
    
    index_content.append("")
    index_content.append("/** All unique songs across all namespaces */")
    index_content.append("export const ALL_SONGS: PhomuSong[] = [")
    for base in sorted(generated_files):
        var_name = base if base[0].isalpha() else f"NUM_{base}"
        var_name = var_name.replace('Ñ', 'ENNE')
        index_content.append(f"  ...( {var_name}.songs as PhomuSong[] ),")
    index_content.append("];")
    
    index_content.append("")
    index_content.append("/** Metadata for all packs (names, descriptions, etc.) */")
    index_content.append("export const PACKS_METADATA = packMetadata;")
    index_content.append("")
    index_content.append("/** All available pack names extracted from metadata */")
    index_content.append("export const AVAILABLE_PACKS: string[] = Object.keys(packMetadata);")
    index_content.append("")
    index_content.append("/** Helper to get songs for specific packs */")
    index_content.append("export function getSongsForPacks(packNames: string[]): PhomuSong[] {")
    index_content.append("  return ALL_SONGS.filter(song => ")
    index_content.append("    song.packs.some(p => packNames.includes(p))")
    index_content.append("  );")
    index_content.append("}")

    with open(os.path.join(target_dir, 'index.ts'), 'w', encoding='utf-8') as f:
        f.write("\n".join(index_content) + "\n")
    print(f"Generated index loader at {os.path.join(target_dir, 'index.ts')}")

if __name__ == "__main__":
    migrate()
