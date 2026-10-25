# Phomu Logic Flow: Automated vs. Manual Validation

Phomu uses a hybrid system to balance the speed of automation with the flexibility of human judgment.

## 1. Validation Logic by Mode
| Mode | Input Type | Validation | Pilot's Role |
| :--- | :--- | :--- | :--- |
| **1. Timeline** | Drag & Drop | **Automated** | Overrides only if a physical card placement is disputed. |
| **2. Hint-Master** | Verbal | **Manual (Pilot)** | Shows solution to Pilot; Pilot clicks [✅] or [❌]. |
| **3. Lyrics** | Multiple Choice | **Automated** | None. System reveals the correct answer and plays music. |
| **4. Vibe-Check** | Selection | **Automated** | None. System records choice and shows community stats. |
| **5. Survivor** | Toggle (A/B) | **Automated** | None. System reveals career stats and awards points. |

## 2. The Pilot & Anti-Cheat UI
For Manual Validation (Mode 2) or sensitive data:
- **Default State:** The "Solution Area" is obscured by a **Swipe-to-Unlock** slider or **Blur** effect.
- **Lock-In Phase:** In Mode 3 (Lyrics), the system disables input and locks the screen once a choice is made, *then* triggers the audio.
- **Pilot Override:** A "Staff Menu" is available in all modes to manually adjust scores or skip turns if a player exits or a technical glitch occurs.

## 3. The "No-Card" Virtual Deck
- If playing without cards, the system pulls a random `PhomuSong` object from the selected Packs.
- The UI replaces the "Scan QR" prompt with a "Draw Digital Card" button.