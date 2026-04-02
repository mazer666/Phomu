import json
import re
import os

scratchpad_path = "/Users/volker/.gemini/antigravity/brain/2fbcd836-2fef-4575-95cc-e13b8a3e67c1/browser/scratchpad_vmzg6z0o.md"
output_path = "/Users/volker/Phomu/Phomu/spreadsheet_data.json"

def extract_youtube_id(link):
    if not link: return None
    # Match standard watch?v= format
    v_match = re.search(r"[?&]v=([^&]+)", link)
    if v_match:
        return v_match.group(1)
    # Match short youtu.be/ format
    be_match = re.search(r"youtu\.be/([^?&]+)", link)
    if be_match:
        return be_match.group(1)
    return link.split('/')[-1] if '/' in link else link

def consolidate():
    with open(scratchpad_path, "r") as f:
        content = f.read()

    # The browser subagent wrote data in fragments like:
    # [...]
    # ,{...},{...}
    # ,{...},{...}
    
    # Let's extract all individual objects {"p":...}
    objects_text = re.findall(r'{[^{]*?"p":.*?\s*}', content, re.DOTALL)
    
    all_records = []
    for obj_text in objects_text:
        try:
            # Clean up the text a bit in case of trailing commas or weird formatting
            cleaned_text = obj_text.strip()
            if cleaned_text.endswith(','):
                cleaned_text = cleaned_text[:-1]
            
            record = json.loads(cleaned_text)
            all_records.append(record)
        except Exception as e:
            # print(f"Error parsing object: {e}")
            pass

    # Deduplicate based on Artist and Track
    unique_records = {}
    for r in all_records:
        if 'a' not in r or 't' not in r or 'c' not in r:
            continue
            
        key = (r['a'].strip().lower(), r['t'].strip().lower())
        yt_id = extract_youtube_id(r['c'])
        if yt_id:
            unique_records[key] = {
                "pack": r['p'],
                "artist": r['a'],
                "track": r['t'],
                "year": r.get('y', ''),
                "youtubeId": yt_id
            }

    final_list = list(unique_records.values())
    
    with open(output_path, "w") as f:
        json.dump(final_list, f, indent=2)
    
    print(f"Successfully consolidated {len(final_list)} unique corrections into spreadsheet_data.json")

if __name__ == "__main__":
    consolidate()
