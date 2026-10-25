import json
import os
import datetime

LOG_FILE = '/tmp/enrich_log_batch2.json'
PACKS_DIR = os.path.abspath('src/data/packs')

def enrich_database():
    if not os.path.exists(LOG_FILE):
        print(f"Error: Log file {LOG_FILE} not found.")
        return

    # Load the enrichment results
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        results = json.load(f)

    print(f"Loaded {len(results)} results from {LOG_FILE}")

    # Load pack files
    packs = {}
    for filename in os.listdir(PACKS_DIR):
        if filename.endswith('.json'):
            path = os.path.join(PACKS_DIR, filename)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    packs[filename] = json.load(f)
            except Exception as e:
                print(f"Error loading {filename}: {e}")

    updated_packs = set()
    total_updated = 0

    # Process results
    for res in results:
        song_id = res['id']
        spotify_id = res.get('spotify')
        amazon_music_id = res.get('amazonMusic')
        
        found = False
        for filename, pack_data in packs.items():
            for song in pack_data.get('songs', []):
                if song.get('id') == song_id:
                    if 'links' not in song:
                        song['links'] = {}
                    
                    # Update or add Spotify link
                    if spotify_id:
                        song['links']['spotify'] = spotify_id
                    
                    # Update or add Amazon Music link
                    if amazon_music_id:
                        song['links']['amazonMusic'] = amazon_music_id
                    
                    updated_packs.add(filename)
                    found = True
                    total_updated += 1
                    break
            if found:
                break
        if not found:
            print(f"Warning: Song ID '{song_id}' not found in any pack.")

    # Save updated packs
    now = datetime.datetime.now().isoformat()
    for filename in updated_packs:
        pack_data = packs[filename]
        if 'meta' in pack_data:
            pack_data['meta']['updatedAt'] = now
        
        path = os.path.join(PACKS_DIR, filename)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(pack_data, f, indent=2, ensure_ascii=False)
        print(f"Updated {filename}")

    print(f"Process complete. {total_updated} songs updated across {len(updated_packs)} packs.")

if __name__ == "__main__":
    enrich_database()
