import json
import os
import sys
import datetime

LOG_FILE = '/tmp/enrich_log_batch3.json'
PACKS_DIR = os.path.abspath('src/data/packs')

def upsert_song(song_id, artist, title, spotify_id, amazon_music_id):
    # 1. Update the log file
    log_data = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                log_data = json.load(f)
        except:
            log_data = []
    
    # Remove existing entry if any
    log_data = [item for item in log_data if item.get('id') != song_id]
    log_data.append({
        "id": song_id,
        "artist": artist,
        "title": title,
        "spotify": spotify_id,
        "amazonMusic": amazon_music_id
    })
    
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)
    
    print(f"Logged: {song_id}")

    # 2. Update the JSON pack
    updated = False
    for filename in os.listdir(PACKS_DIR):
        if filename.endswith('.json'):
            path = os.path.join(PACKS_DIR, filename)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    pack_data = json.load(f)
                
                for song in pack_data.get('songs', []):
                    if song.get('id') == song_id:
                        if 'links' not in song:
                            song['links'] = {}
                        song['links']['spotify'] = spotify_id
                        song['links']['amazonMusic'] = amazon_music_id
                        
                        # Update updatedAt
                        if 'meta' in pack_data:
                            pack_data['meta']['updatedAt'] = datetime.datetime.now().isoformat()
                        
                        with open(path, 'w', encoding='utf-8') as fw:
                            json.dump(pack_data, fw, indent=2, ensure_ascii=False)
                        
                        print(f"Updated pack: {filename}")
                        updated = True
            except Exception as e:
                print(f"Error processing {filename}: {e}")
    
    if not updated:
        print(f"Warning: Song ID '{song_id}' not found in any pack.")

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python3 upsert_song.py <id> <artist> <title> <spotify> <amazon>")
        sys.exit(1)
    
    upsert_song(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
