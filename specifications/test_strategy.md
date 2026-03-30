# Phomu Test Strategy

## 1. Manual Acceptance Tests
- **Noob-Verification:** Every UI element must be intuitive without reading a manual.
- **Pilot Test:** Verify that the "Pilot" can add/remove players mid-game without crashing the session.

## 2. Responsive UI Audit
- Test all screens on 360px (iPhone SE), 768px (iPad), and 1920px (Desktop).
- Ensure buttons remain large enough for touch input (min 44x44px).

## 3. Data Resilience
- If a Spotify link is broken, the system must automatically show the YouTube or Apple Music alternative.

## 4. Privacy Audit
- Ensure no data is sent to external trackers. Verify Supabase region is set to EU (if applicable).