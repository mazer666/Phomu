import json
import os
import sys

def update_pack(pack_file_path, corrections_path, dry_run=True):
    if not os.path.exists(pack_file_path):
        print(f"Error: Pack file {pack_file_path} not found.")
        return
    
    if not os.path.exists(corrections_path):
        print(f"Error: Corrections file {corrections_path} not found.")
        return

    with open(pack_file_path, "r") as f:
        pack_data = json.load(f)
    
    with open(corrections_path, "r") as f:
        corrections = json.load(f)

    pack_id = pack_data.get("id", "")
    pack_name = pack_data.get("name", "")
    
    print(f"Checking updates for pack: {pack_name} ({pack_id})")
    
    updates_found = 0
    updated_songs = []
    
    # Create lookup for corrections
    # Key: (Artist, Track)
    lookup = {}
    for c in corrections:
        key = (c["artist"].strip().lower(), c["track"].strip().lower())
        lookup[key] = c["youtubeId"]

    # Iterate through songs in pack
    for song in pack_data.get("songs", []):
        artist = song.get("artist", "").strip().lower()
        title = song.get("title", "").strip().lower()
        
        key = (artist, title)
        if key in lookup:
            new_yt_id = lookup[key]
            old_yt_id = song.get("links", {}).get("youtube", "")
            
            if old_yt_id != new_yt_id:
                updates_found += 1
                updated_songs.append(f"{song.get('artist')} - {song.get('title')}: {old_yt_id} -> {new_yt_id}")
                if not dry_run:
                    if "links" not in song:
                        song["links"] = {}
                    song["links"]["youtube"] = new_yt_id

    if updates_found == 0:
        print("No updates found for this pack.")
        return

    print(f"Found {updates_found} updates:")
    for report in updated_songs:
        print(f"  {report}")

    if not dry_run:
        with open(pack_file_path, "w") as f:
            json.dump(pack_data, f, indent=2, ensure_ascii=False)
        print(f"Successfully updated {pack_file_path}")
    else:
        print(f"DRY RUN: {updates_found} changes would be applied.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 update_pack.py <pack_file_path> [--apply]")
        sys.exit(1)
    
    pack_path = sys.argv[1]
    apply_flag = "--apply" in sys.argv
    corrections_file = "spreadsheet_data.json"
    
    update_pack(pack_path, corrections_file, dry_run=not apply_flag)
