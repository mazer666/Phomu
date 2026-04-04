import json
import os
import sys
import datetime

LOG_FILE = '/tmp/enrich_log_batch3.json'
PACKS_DIR = os.path.abspath('src/data/packs')

def apply_enrichment(results_file):
    if not os.path.exists(results_file):
        print(f"Error: Results file {results_file} not found.")
        return

    with open(results_file, 'r', encoding='utf-8') as f:
        results = json.load(f)

    # 1. Update the log file
    log_data = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                log_data = json.load(f)
        except:
            log_data = []
    
    for item in results:
        song_id = item['id']
        # Remove existing entry if any
        log_data = [l for l in log_data if l.get('id') != song_id]
        log_data.append({
            "id": song_id,
            "artist": item['artist'],
            "title": item['title'],
            "spotify": item['spotify'],
            "amazonMusic": item['amazonMusic']
        })
    
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)
    print(f"Logged {len(results)} songs to {LOG_FILE}")

    # 2. Update the JSON packs
    updated_songs_map = {item['id']: item for item in results}
    
    for filename in os.listdir(PACKS_DIR):
        if filename.endswith('.json'):
            path = os.path.join(PACKS_DIR, filename)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    pack_data = json.load(f)
                
                pack_updated = False
                for song in pack_data.get('songs', []):
                    sid = song.get('id')
                    if sid in updated_songs_map:
                        res = updated_songs_map[sid]
                        if 'links' not in song:
                            song['links'] = {}
                        song['links']['spotify'] = res['spotify']
                        song['links']['amazonMusic'] = res['amazonMusic']
                        pack_updated = True
                        print(f"  Updated song '{sid}' in {filename}")
                
                if pack_updated:
                    if 'meta' in pack_data:
                        pack_data['meta']['updatedAt'] = datetime.datetime.now().isoformat()
                    
                    with open(path, 'w', encoding='utf-8') as fw:
                        json.dump(pack_data, fw, indent=2, ensure_ascii=False)
                    print(f"Saved pack: {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 apply_enrichment.py <results_json_file>")
        sys.exit(1)
    
    apply_enrichment(sys.argv[1])
