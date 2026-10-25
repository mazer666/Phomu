import json
import re
import os

# --- Config ---
WORKSPACE_PATH = "/Users/volker/Phomu/Phomu"
DATA_PACKS_PATH = os.path.join(WORKSPACE_PATH, "src/data/packs")
SCRATCHPAD_PATH = "/Users/volker/.gemini/antigravity/brain/7f94e3a8-3027-4eee-a6f1-49855065dcf2/browser/scratchpad_xzpvf1ks.md"
OUTPUT_PATH = os.path.join(DATA_PACKS_PATH, "youtube-import.json")

# --- Heuristics ---
PLAYLIST_METADATA = {
    "PLdqeK1lIVdqP0vABIL_udNoS-F1dXWYYC": {"year": 2022, "genre": "Pop", "tag": "Modern Hits"},
    "PLdqeK1lIVdqOClZShISePThMukEvPwhBL": {"year": 1985, "genre": "Pop", "tag": "80s Flashback"},
    "PLdqeK1lIVdqOIPyJgXXNBn5ESny2kEZEc": {"year": 1968, "genre": "Classic Pop", "tag": "60s/70s Legends"},
    "PLdqeK1lIVdqN4cv3nxPV_ifRaAekif84S": {"year": 1982, "genre": "NDW", "tag": "German New Wave"},
    "PLdqeK1lIVdqNekbEfWOVbpK8Mz5f1fcl0": {"year": 2024, "genre": "Pop", "tag": "Current Hits"},
    "PLdqeK1lIVdqO9FMAUv9XgLKoDX6h_-usf": {"year": 2021, "genre": "Pop", "tag": "Modern Anthems"},
    "PLdqeK1lIVdqP1xxwgEvjWA4Y0U3DNpgnH": {"year": 2024, "genre": "Electronic", "tag": "Dance Floor"},
    "PL2qlNvGudSBH5-oCF21Zqmx6rRk0ygfEP": {"year": 2016, "genre": "Latin Pop", "tag": "Latin Heat"},
    "PLJRD9buHCsWAosdfF2EPQkGtnwk8krpHO": {"year": 2017, "genre": "Latin Pop", "tag": "Latin Essentials"},
}

def clean_song_info(title):
    suffixes = [
        r"\(Official Video\)", r"\(Official Music Video\)", r"\[Official Video\]",
        r"\(Lyric Video\)", r"\[Lyric Video\]", r"\(Official Audio\)",
        r"\(Remastered\)", r"\(Remastered \d+\)", r"\(Original Mix\)",
        r"ft\..*", r"feat\..*", r"with .*", r"& .*", r"OFFICIAL VIDEO.*",
        r"\(CLIP OFFICIEL\)", r"\(Audio officiel\)"
    ]
    cleaned = title
    for s in suffixes:
        cleaned = re.sub(s, "", cleaned, flags=re.IGNORECASE).strip()
    
    parts = []
    if " - " in cleaned:
        parts = cleaned.split(" - ", 1)
    elif ": " in cleaned:
        parts = cleaned.split(": ", 1)
    
    artist = "Unknown Artist"
    song_title = cleaned
    
    if len(parts) == 2:
        artist = parts[0].strip()
        song_title = parts[1].strip()
    
    return artist.title(), song_title

def run():
    existing_keys = set()
    for filename in os.listdir(DATA_PACKS_PATH):
        if filename.endswith(".json"):
            with open(os.path.join(DATA_PACKS_PATH, filename), 'r') as f:
                try:
                    data = json.load(f)
                    for s in data.get("songs", []):
                        key = f"{s['artist'].lower().strip()}|{s['title'].lower().strip()}"
                        existing_keys.add(key)
                except: pass
    
    import_songs = []
    seen_in_import = set()
    with open(SCRATCHPAD_PATH, 'r') as f:
        content = f.read()
    
    matches = re.finditer(r"- Playlist (\d+): (\[.*?\])", content, re.DOTALL)
    for match in matches:
        pl_idx = match.group(1)
        pl_id_match = re.search(fr"- \[x\] Extraction from Playlist {pl_idx}: `(.*?)`", content)
        if not pl_id_match: continue
        pl_id = pl_id_match.group(1)
        meta = PLAYLIST_METADATA.get(pl_id, {"year": 2000, "genre": "Pop", "tag": "Imported"})
        
        songs_data = json.loads(match.group(2))
        for s_raw in songs_data:
            artist, title = clean_song_info(s_raw["title"])
            videoId = s_raw["videoId"]
            key = f"{artist.lower().strip()}|{title.lower().strip()}"
            if key in existing_keys or key in seen_in_import: continue
            seen_in_import.add(key)
            
            import_songs.append({
                "id": f"yt-{videoId}", "title": title, "artist": artist, "year": meta["year"],
                "country": "INT", "genre": meta["genre"], "difficulty": "medium", "mood": ["Popular"],
                "pack": "YouTube Collection", "hints": [f"Ein Song von {artist}.", f"Aus {meta['year']}.", f"Titel: {title}", "YouTube Fundstück", f"{meta['tag']}"],
                "lyrics": None, "isOneHitWonder": False, "links": {"youtube": f"https://www.youtube.com/watch?v={videoId}"},
                "supportedModes": ["timeline"], "isQRCompatible": False
            })
    
    with open(OUTPUT_PATH, 'w') as f:
        json.dump({"name": "YouTube Collection", "songs": import_songs}, f, indent=2, ensure_ascii=False)
    print(f"Imported {len(import_songs)} songs.")

if __name__ == "__main__":
    run()
