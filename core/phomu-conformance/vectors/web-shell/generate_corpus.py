#!/usr/bin/env python3
"""The generator of the conformance corpus of the web shell.

WHAT: writes the 70 vector files of this directory and the index.

WHY: the corpus is a **golden file**: the expectations were derived by
reading the TypeScript reference (`src/stores/game-store.ts`,
`src/components/game/modes/*.tsx`, `src/utils/mode-rules.ts`) and were
then checked against the runner — every expectation was reviewed against
`docs/design/GAME-CONTRACT.md` § 4 and § 5. The generator makes the corpus
reproducible; **the committed files are the reviewed artefact**.

EXAMPLE: `python3 generate_corpus.py` rewrites the corpus.
"""
import json
import pathlib

OUT = pathlib.Path(__file__).resolve().parent

SONG_A = {
    "id": "s-a", "title": "Example Song", "artist": "The Example", "year": 1985,
    "country": "US", "genre": "Rock", "difficulty": "medium",
    "mood": ["Dance Floor", "Epic"], "packs": ["Rock Anthems"],
    "hints": ["Hint one", "Hint two", "Hint three", "Hint four", "Hint five"],
    "lyrics": {"real": ["Real one", "Real two", "Real three"], "fake": "Fake one"},
    "isOneHitWonder": False,
    "supportedModes": ["timeline", "hint-master", "lyrics", "vibe-check", "survivor", "cover-confusion"],
    "isQRCompatible": True,
    "links": {"youtube": "https://www.youtube.com/watch?v=aaaaaaaaaaa"},
}

SONG_B = {
    "id": "s-b", "title": "Cover Song", "artist": "Cover Artist", "year": 1998,
    "country": "GB", "genre": "Pop", "difficulty": "hard",
    "mood": ["Chill", "Nostalgic"], "packs": ["80s Flashback"],
    "hints": ["Cover hint one", "Cover hint two", "Cover hint three", "Cover hint four", "Cover hint five"],
    "lyrics": None,
    "isOneHitWonder": True,
    "supportedModes": ["timeline", "hint-master", "vibe-check", "survivor", "cover-confusion"],
    "isQRCompatible": False,
    "links": {"youtube": "https://www.youtube.com/watch?v=bbbbbbbbbbb",
              "coverLink": "https://www.youtube.com/watch?v=cccccccccc"},
}

CATALOGUE = [
    {"id": "c1", "title": "Rock One", "artist": "Rockers", "year": 1971,
     "difficulty": "easy", "packs": ["Rock Anthems"], "mood": ["Epic"],
     "lyrics": None, "supportedModes": ["timeline", "vibe-check"],
     "isQRCompatible": True, "links": {"youtube": "u1"}},
    {"id": "c2", "title": "Rock Two", "artist": "Rockers", "year": 1982,
     "difficulty": "hard", "packs": ["Rock Anthems", "80s Flashback"], "mood": ["Epic"],
     "lyrics": {"real": ["a", "b", "c"], "fake": "d"},
     "supportedModes": ["timeline", "lyrics"], "isQRCompatible": False,
     "links": {"youtube": "u2"}},
    {"id": "c3", "title": "Flashback", "artist": "Flashbacks", "year": 1989,
     "difficulty": "medium", "packs": ["80s Flashback"], "mood": ["Nostalgic"],
     "lyrics": None, "supportedModes": ["timeline"], "isQRCompatible": True,
     "links": {"youtube": "u3"}},
    {"id": "c4", "title": "Electro", "artist": "Machines", "year": 2004,
     "difficulty": "easy", "packs": ["Electronic & Techno"], "mood": ["Dance Floor"],
     "lyrics": None, "supportedModes": ["vibe-check"], "isQRCompatible": True,
     "links": {"youtube": "u4"}},
    {"id": "c5", "title": "Electro Two", "artist": "Machines", "year": 2011,
     "difficulty": "medium", "packs": ["Electronic & Techno"], "mood": ["Dance Floor"],
     "lyrics": None, "supportedModes": ["timeline", "vibe-check"],
     "isQRCompatible": False, "links": {"youtube": "u5"}},
    {"id": "c6", "title": "Metal One", "artist": "Metallers", "year": 1995,
     "difficulty": "hard", "packs": ["Metal & Hardcore"], "mood": ["Dark"],
     "lyrics": None, "supportedModes": ["timeline"],
     "isQRCompatible": False, "links": {"youtube": "u6"}},
]


def obs(phases, **kw):
    """The observation with the default values of an untouched session."""
    base = {
        "phases": phases,
        "currentRound": 0,
        "currentMode": "timeline",
        "currentSongId": None,
        "currentSongSource": None,
        "autoDrawIntent": False,
        "playerScores": {},
        "teamScores": {},
        "playerTeams": {},
        "teamMembers": {},
        "turnOrder": [],
        "currentTurnIndex": 0,
        "winnerId": None,
        "isGameOver": False,
        "timelineYears": [],
        "playedSongIds": [],
        "answers": [],
        "roundCount": 0,
        "totalXP": 0,
        "censorHint": None,
        "filteredSongIds": None,
        "error": None,
    }
    base.update(kw)
    return base


def answer(pl, is_correct, points, seconds=None):
    return {
        "playerId": pl,
        "answer": "correct" if is_correct else "incorrect",
        "outcome": "correct" if is_correct else "incorrect",
        "isCorrect": is_correct,
        "pointsAwarded": points,
        "answeredInSeconds": seconds,
    }


def player(pid, name, score=0, team=None, pilot=False):
    return {"id": pid, "name": name, "score": score, "teamId": team,
            "isEliminated": False, "isSpectator": False, "isPilot": pilot}


def team(tid, name, members=(), score=0):
    return {"id": tid, "name": name, "playerIds": list(members), "score": score,
            "color": "#FF6B35"}


VECTORS = []


def add(vid, area, title, given, when, then, reference, portable=True, note=None):
    entry = {
        "schemaVersion": 1,
        "id": vid,
        "area": area,
        "title": title,
        "reference": reference,
        "portable": portable,
    }
    if note:
        entry["portabilityNote"] = note
    # The reference remembers a drawn song and names its source
    # (`src/stores/game-store.ts`:399).
    if given.get("currentSong"):
        then["playedSongIds"] = [given["currentSong"]]
        then["currentSongSource"] = given.get("currentSongSource") or "random"
    entry["given"] = given
    entry["when"] = when
    entry["then"] = then
    VECTORS.append(entry)


# ─── Phase machine (GAME-CONTRACT section 2) ────────────────────────

add("phase/drawing-to-question", "phase-machine",
    "Drawing a song moves the round into the question phase",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "drawing", "currentMode": "timeline",
     "songs": {"s-a": SONG_A}},
    [{"op": "drawSong", "songId": "s-a"}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        currentSongSource="random", playerScores={"p1": 0}, playerTeams={"p1": None},
        turnOrder=["p1"], playedSongIds=["s-a"]),
    "src/stores/game-store.ts:394-402")

add("phase/question-to-reveal", "phase-machine",
    "The reveal phase is entered by advancePhase",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "drawing", "currentMode": "timeline",
     "songs": {"s-a": SONG_A}},
    [{"op": "drawSong", "songId": "s-a"}, {"op": "advancePhase", "phase": "reveal"}],
    obs(["question", "reveal"], currentRound=1, currentMode="timeline",
        currentSongId="s-a", currentSongSource="random",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        playedSongIds=["s-a"]),
    "src/stores/game-store.ts:439-441")

add("phase/reveal-to-drawing", "phase-machine",
    "The next round starts in the drawing phase and clears the song",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "drawing", "currentMode": "timeline",
     "songs": {"s-a": SONG_A}},
    [{"op": "drawSong", "songId": "s-a"}, {"op": "advancePhase", "phase": "reveal"},
     {"op": "nextRound"}],
    obs(["question", "reveal", "drawing"], currentRound=2, currentMode="timeline",
        currentSongId=None, currentSongSource="random",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        playedSongIds=["s-a"], roundCount=1),
    "src/stores/game-store.ts:365-375")

add("phase/reveal-to-scoring", "phase-machine",
    "endGame moves the round into the scoring phase",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "drawing", "currentMode": "timeline",
     "songs": {"s-a": SONG_A}},
    [{"op": "drawSong", "songId": "s-a"}, {"op": "advancePhase", "phase": "reveal"},
     {"op": "endGame"}],
    obs(["question", "reveal", "scoring"], currentRound=1, currentMode="timeline",
        currentSongId="s-a", currentSongSource="random",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        playedSongIds=["s-a"], isGameOver=True),
    "src/stores/game-store.ts:379-391")

add("phase/skip-broken-random", "phase-machine",
    "A broken song from the random draw is discarded and re-drawn automatically",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "question", "currentMode": "timeline",
     "currentSong": "s-a", "currentSongSource": "random",
     "songs": {"s-a": SONG_A}},
    [{"op": "skipBrokenSong"}],
    obs(["drawing"], currentRound=1, currentMode="timeline", currentSongId=None,
        currentSongSource="random", autoDrawIntent=True,
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/stores/game-store.ts:414-416")

add("phase/skip-broken-qr", "phase-machine",
    "A broken song from a QR scan keeps the song — the pilot scans again",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "question", "currentMode": "timeline",
     "currentSong": "s-a", "currentSongSource": "qr",
     "songs": {"s-a": SONG_A}},
    [{"op": "skipBrokenSong"}],
    obs(["drawing"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        currentSongSource="qr", autoDrawIntent=False,
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/stores/game-store.ts:408-412")

add("phase/locked-in-declared", "phase-machine",
    "The declared phase `locked-in` can be set — no flow enters it",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "question", "currentMode": "timeline"},
    [{"op": "advancePhase", "phase": "locked-in"}],
    obs(["locked-in"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/stores/game-store.ts:439-441",
    portable=False,
    note=("The phase `locked-in` is declared but entered by no flow "
          "(GAME-CONTRACT section 2.1, deviation A6). The TypeScript store "
          "accepts it; the Rust core decides whether an undeclared transition "
          "is a typed error (CORE-111). The divergence is intentional and must "
          "be decided by the owner (OPEN-08)."))

add("phase/start-game-turn-order-individual", "phase-machine",
    "startGame builds the turn order from the players in the individual mode",
    {"config": {"selectedModes": ["timeline"], "teamMode": "individual"},
     "players": [player("p1", "Ada"), player("p2", "Bo")],
     "teams": [team("t1", "Team One"), team("t2", "Team Two")],
     "currentRound": 0, "roundPhase": "drawing", "currentMode": "timeline"},
    [{"op": "startGame"}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0, "p2": 0}, playerTeams={"p1": None, "p2": None},
        teamScores={"t1": 0, "t2": 0}, teamMembers={"t1": [], "t2": []},
        turnOrder=["p1", "p2"], currentTurnIndex=0),
    "src/stores/game-store.ts:255-275")

add("phase/start-game-turn-order-teams", "phase-machine",
    "startGame builds the turn order from the teams in the fixed team mode",
    {"config": {"selectedModes": ["timeline"], "teamMode": "fixed"},
     "players": [player("p1", "Ada", team="t1"), player("p2", "Bo", team="t2")],
     "teams": [team("t1", "Team One", ["p1"]), team("t2", "Team Two", ["p2"])],
     "currentRound": 0, "roundPhase": "drawing", "currentMode": "timeline"},
    [{"op": "startGame"}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0, "p2": 0}, playerTeams={"p1": "t1", "p2": "t2"},
        teamScores={"t1": 0, "t2": 0}, teamMembers={"t1": ["p1"], "t2": ["p2"]},
        turnOrder=["t1", "t2"], currentTurnIndex=0),
    "src/stores/game-store.ts:255-275")

# ─── Round logic (GAME-CONTRACT section 6) ──────────────────────────

add("round/next-round-increments-and-rotates", "round-logic",
    "The next round increments the round and rotates the turn",
    {"config": {"selectedModes": ["timeline"], "endingCondition": "rounds",
                "targetRounds": 30},
     "players": [player("p1", "Ada"), player("p2", "Bo")],
     "turnOrder": ["p1", "p2"], "currentTurnIndex": 0, "currentRound": 1,
     "roundPhase": "reveal", "currentMode": "timeline"},
    [{"op": "nextRound"}],
    obs(["drawing"], currentRound=2, currentMode="timeline",
        playerScores={"p1": 0, "p2": 0}, playerTeams={"p1": None, "p2": None},
        turnOrder=["p1", "p2"], currentTurnIndex=1),
    "src/stores/game-store.ts:345-347")

add("round/next-round-logs-history", "round-logic",
    "A round with a drawn song is written into the history",
    {"config": {"selectedModes": ["timeline"], "endingCondition": "rounds",
                "targetRounds": 30},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "reveal", "currentMode": "timeline", "currentSong": "s-a",
     "songs": {"s-a": SONG_A}},
    [{"op": "nextRound"}],
    obs(["drawing"], currentRound=2, currentMode="timeline", currentSongId=None,
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        roundCount=1),
    "src/stores/game-store.ts:331-343")

add("round/next-round-without-song-does-not-log", "round-logic",
    "A round without a drawn song is not written into the history",
    {"config": {"selectedModes": ["timeline"], "endingCondition": "rounds",
                "targetRounds": 30},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "reveal", "currentMode": "timeline"},
    [{"op": "nextRound"}],
    obs(["drawing"], currentRound=2, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        roundCount=0),
    "src/stores/game-store.ts:331-343")

add("round/win-by-points", "round-logic",
    "At the end of the rotation the points condition ends the game",
    {"config": {"selectedModes": ["timeline"], "endingCondition": "points",
                "targetPoints": 10, "teamMode": "individual"},
     "players": [player("p1", "Ada", score=12), player("p2", "Bo", score=3)],
     "turnOrder": ["p1", "p2"], "currentTurnIndex": 1, "currentRound": 1,
     "roundPhase": "reveal", "currentMode": "timeline"},
    [{"op": "nextRound"}],
    obs(["scoring"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 12, "p2": 3}, playerTeams={"p1": None, "p2": None},
        turnOrder=["p1", "p2"], currentTurnIndex=1, winnerId="p1",
        isGameOver=True, totalXP=15),
    "src/stores/game-store.ts:303-311")

add("round/win-by-points-team", "round-logic",
    "At the end of the rotation the points condition ends the team game",
    {"config": {"selectedModes": ["timeline"], "endingCondition": "points",
                "targetPoints": 10, "teamMode": "fixed"},
     "players": [player("p1", "Ada", team="t1"), player("p2", "Bo", team="t2")],
     "teams": [team("t1", "Team One", ["p1"], score=12), team("t2", "Team Two", ["p2"], score=3)],
     "turnOrder": ["t1", "t2"], "currentTurnIndex": 1, "currentRound": 1,
     "roundPhase": "reveal", "currentMode": "timeline"},
    [{"op": "nextRound"}],
    obs(["scoring"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0, "p2": 0}, playerTeams={"p1": "t1", "p2": "t2"},
        teamScores={"t1": 12, "t2": 3}, teamMembers={"t1": ["p1"], "t2": ["p2"]},
        turnOrder=["t1", "t2"], currentTurnIndex=1, winnerId="t1",
        isGameOver=True, totalXP=0),
    "src/stores/game-store.ts:303-311")

add("round/win-by-rounds", "round-logic",
    "At the end of the rotation the rounds condition ends the game without a winner",
    {"config": {"selectedModes": ["timeline"], "endingCondition": "rounds",
                "targetRounds": 1, "teamMode": "individual"},
     "players": [player("p1", "Ada"), player("p2", "Bo")],
     "turnOrder": ["p1", "p2"], "currentTurnIndex": 1, "currentRound": 2,
     "roundPhase": "reveal", "currentMode": "timeline"},
    [{"op": "nextRound"}],
    obs(["scoring"], currentRound=2, currentMode="timeline",
        playerScores={"p1": 0, "p2": 0}, playerTeams={"p1": None, "p2": None},
        turnOrder=["p1", "p2"], currentTurnIndex=1, winnerId=None,
        isGameOver=True),
    "src/stores/game-store.ts:312-316")

add("round/win-by-time", "round-logic",
    "At the end of the rotation the time condition ends the game without a winner",
    {"config": {"selectedModes": ["timeline"], "endingCondition": "time",
                "targetTimeMinutes": 60, "teamMode": "individual"},
     "players": [player("p1", "Ada"), player("p2", "Bo")],
     "turnOrder": ["p1", "p2"], "currentTurnIndex": 1, "currentRound": 1,
     "roundPhase": "reveal", "currentMode": "timeline",
     "gameStartTime": 1700000000000},
    [{"op": "setNow", "ms": 1700000000000 + 61 * 60 * 1000}, {"op": "nextRound"}],
    obs(["reveal", "scoring"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0, "p2": 0}, playerTeams={"p1": None, "p2": None},
        turnOrder=["p1", "p2"], currentTurnIndex=1, winnerId=None,
        isGameOver=True),
    "src/stores/game-store.ts:317-322")

add("round/no-win-before-end-of-rotation", "round-logic",
    "The win conditions are only checked at the end of the rotation",
    {"config": {"selectedModes": ["timeline"], "endingCondition": "points",
                "targetPoints": 10, "teamMode": "individual"},
     "players": [player("p1", "Ada", score=12), player("p2", "Bo")],
     "turnOrder": ["p1", "p2"], "currentTurnIndex": 0, "currentRound": 1,
     "roundPhase": "reveal", "currentMode": "timeline"},
    [{"op": "nextRound"}],
    obs(["drawing"], currentRound=2, currentMode="timeline",
        playerScores={"p1": 12, "p2": 0}, playerTeams={"p1": None, "p2": None},
        turnOrder=["p1", "p2"], currentTurnIndex=1, isGameOver=False),
    "src/stores/game-store.ts:300-302")

add("round/end-game-awards-xp", "round-logic",
    "endGame adds the points of the session to the total XP",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada", score=7), player("p2", "Bo", score=5)],
     "turnOrder": ["p1"], "currentRound": 3, "roundPhase": "reveal",
     "currentMode": "timeline", "totalXP": 3},
    [{"op": "endGame", "winnerId": "p1"}],
    obs(["scoring"], currentRound=3, currentMode="timeline",
        playerScores={"p1": 7, "p2": 5}, playerTeams={"p1": None, "p2": None},
        turnOrder=["p1"], winnerId="p1", isGameOver=True, totalXP=15),
    "src/stores/game-store.ts:379-391")

# ─── Timeline mode ──────────────────────────────────────────────────

TIMELINE_GIVEN = {
    "config": {"selectedModes": ["timeline"], "timelineMaxPoints": 5},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "question", "currentMode": "timeline",
    "timelineYears": [1970, 1980, 1990], "currentSong": "s-a",
    "songs": {"s-a": SONG_A},
}

add("timeline/correct-canonical-slot", "scoring.timeline",
    "The canonical slot is correct and awards one point per year on the timeline",
    TIMELINE_GIVEN,
    [{"op": "answer", "mode": "timeline", "answer": {"kind": "timeline", "slot": 2}}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        playerScores={"p1": 4}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1970, 1980, 1985, 1990],
        answers=[answer("p1", True, 4)]),
    "src/components/game/modes/TimelineMode.tsx:117-139, 202")

add("timeline/wrong-slot", "scoring.timeline",
    "A wrong slot awards no points and leaves the timeline unchanged",
    TIMELINE_GIVEN,
    [{"op": "answer", "mode": "timeline", "answer": {"kind": "timeline", "slot": 1}}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1970, 1980, 1990],
        answers=[answer("p1", False, 0)]),
    "src/components/game/modes/TimelineMode.tsx:225-261")

add("timeline/duplicate-year", "scoring.timeline",
    "A duplicate year is added and removed again — the timeline stays the same",
    dict(TIMELINE_GIVEN, timelineYears=[1970, 1980, 1985]),
    [{"op": "answer", "mode": "timeline", "answer": {"kind": "timeline", "slot": 2}}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        playerScores={"p1": 4}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1970, 1980, 1985],
        answers=[answer("p1", True, 4)]),
    "src/components/game/modes/TimelineMode.tsx:239-250")

add("timeline/points-cap", "scoring.timeline",
    "The timeline points are capped at the configured maximum",
    dict(TIMELINE_GIVEN,
         currentSong="s-c",
         timelineYears=[1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000],
         songs={"s-c": dict(SONG_A, id="s-c", year=1992)}),
    [{"op": "answer", "mode": "timeline", "answer": {"kind": "timeline", "slot": 7}}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-c",
        playerScores={"p1": 5}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1960, 1965, 1970, 1975, 1980, 1985, 1990, 1992, 1995, 2000],
        answers=[answer("p1", True, 5)]),
    "src/components/game/modes/TimelineMode.tsx:202")

add("timeline/no-selection-does-nothing", "scoring.timeline",
    "Without a selected slot the reveal is aborted — no answer, no points",
    TIMELINE_GIVEN,
    [{"op": "answer", "mode": "timeline", "answer": {"kind": "timeline", "slot": None}}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1970, 1980, 1990], answers=[]),
    "src/components/game/modes/TimelineMode.tsx:226")

add("timeline/cheat-decade-hint-penalty", "scoring.timeline",
    "The decade hint costs two points",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada", score=5)], "turnOrder": ["p1"],
     "currentRound": 1, "roundPhase": "question", "currentMode": "timeline",
     "currentSong": "s-a", "songs": {"s-a": SONG_A}},
    [{"op": "cheat", "cheat": "timeline-decade-hint"}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        playerScores={"p1": 3}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/components/game/modes/TimelineMode.tsx:268-274; src/utils/mode-rules.ts")

add("timeline/score-floor-zero", "scoring.timeline",
    "The score never falls below zero",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada", score=1)], "turnOrder": ["p1"],
     "currentRound": 1, "roundPhase": "question", "currentMode": "timeline",
     "currentSong": "s-a", "songs": {"s-a": SONG_A}},
    [{"op": "cheat", "cheat": "timeline-decade-hint"}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/stores/game-store.ts:451-476")

# ─── Hint-Master mode ───────────────────────────────────────────────

HINT_GIVEN = {
    "config": {"selectedModes": ["hint-master"]},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "question", "currentMode": "hint-master",
    "currentSong": "s-a", "songs": {"s-a": SONG_A},
}

add("hint-master/both-level-1", "scoring.hint-master",
    "Knowing artist and title at level 1 awards the full five points",
    HINT_GIVEN,
    [{"op": "answer", "mode": "hint-master",
      "answer": {"kind": "hint-master", "level": 1, "knew": "both"}}],
    obs(["question"], currentRound=1, currentMode="hint-master", currentSongId="s-a",
        playerScores={"p1": 5}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 5)]),
    "src/components/game/modes/HintMasterMode.tsx:65-74")

add("hint-master/artist-level-5", "scoring.hint-master",
    "Knowing only the artist at level 5 awards half of one point — rounded up",
    HINT_GIVEN,
    [{"op": "answer", "mode": "hint-master",
      "answer": {"kind": "hint-master", "level": 5, "knew": "artist"}}],
    obs(["question"], currentRound=1, currentMode="hint-master", currentSongId="s-a",
        playerScores={"p1": 1}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 1)]),
    "src/components/game/modes/HintMasterMode.tsx:65-74")

add("hint-master/nothing", "scoring.hint-master",
    "Knowing nothing is a wrong answer and awards no points",
    HINT_GIVEN,
    [{"op": "answer", "mode": "hint-master",
      "answer": {"kind": "hint-master", "level": 3, "knew": "none"}}],
    obs(["question"], currentRound=1, currentMode="hint-master", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", False, 0)]),
    "src/components/game/modes/HintMasterMode.tsx:65-74")

add("hint-master/music-cheat-penalty", "scoring.hint-master",
    "The music cheat costs two points",
    dict(HINT_GIVEN, players=[player("p1", "Ada", score=5)]),
    [{"op": "cheat", "cheat": "hint-master-music"}],
    obs(["question"], currentRound=1, currentMode="hint-master", currentSongId="s-a",
        playerScores={"p1": 3}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/components/game/modes/HintMasterMode.tsx:76-82; src/utils/mode-rules.ts")

# ─── Lyrics Labyrinth mode ──────────────────────────────────────────

LYRICS_GIVEN = {
    "config": {"selectedModes": ["lyrics"]},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "question", "currentMode": "lyrics",
    "currentSong": "s-a", "songs": {"s-a": SONG_A},
}

add("lyrics/fake-line", "scoring.lyrics",
    "Picking the fake line awards four points",
    LYRICS_GIVEN,
    [{"op": "answer", "mode": "lyrics", "answer": {"kind": "lyrics", "picked": "fake"}}],
    obs(["question"], currentRound=1, currentMode="lyrics", currentSongId="s-a",
        playerScores={"p1": 4}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 4)]),
    "src/components/game/modes/LyricsMode.tsx:114-121")

add("lyrics/real-line", "scoring.lyrics",
    "Picking a real line awards no points",
    LYRICS_GIVEN,
    [{"op": "answer", "mode": "lyrics", "answer": {"kind": "lyrics", "picked": "real"}}],
    obs(["question"], currentRound=1, currentMode="lyrics", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", False, 0)]),
    "src/components/game/modes/LyricsMode.tsx:114-121")

add("lyrics/bonus-claimed", "scoring.lyrics",
    "The bonus round of a song without lyrics awards two points",
    {"config": {"selectedModes": ["lyrics"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "question", "currentMode": "lyrics",
     "currentSong": "s-b", "songs": {"s-b": SONG_B}},
    [{"op": "answer", "mode": "lyrics",
      "answer": {"kind": "lyrics-bonus", "claimed": True}}],
    obs(["question"], currentRound=1, currentMode="lyrics", currentSongId="s-b",
        playerScores={"p1": 2}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 2)]),
    "src/components/game/modes/LyricsMode.tsx:287-302")

# ─── Vibe-Check mode ────────────────────────────────────────────────

VIBE_GIVEN = {
    "config": {"selectedModes": ["vibe-check"]},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "question", "currentMode": "vibe-check",
    "currentSong": "s-a", "songs": {"s-a": SONG_A},
}

add("vibe-check/matching-mood", "scoring.vibe-check",
    "A mood of the song awards two points",
    VIBE_GIVEN,
    [{"op": "answer", "mode": "vibe-check",
      "answer": {"kind": "vibe-check", "mood": "Epic"}}],
    obs(["question"], currentRound=1, currentMode="vibe-check", currentSongId="s-a",
        playerScores={"p1": 2}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 2)]),
    "src/components/game/modes/VibeCheckMode.tsx:121-128")

add("vibe-check/cheated", "scoring.vibe-check",
    "After the cheat a matching mood awards only one point",
    VIBE_GIVEN,
    [{"op": "answer", "mode": "vibe-check",
      "answer": {"kind": "vibe-check", "mood": "Epic", "cheatUsed": True}}],
    obs(["question"], currentRound=1, currentMode="vibe-check", currentSongId="s-a",
        playerScores={"p1": 1}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 1)]),
    "src/components/game/modes/VibeCheckMode.tsx:121-128")

add("vibe-check/wrong-mood", "scoring.vibe-check",
    "A mood the song does not have awards no points",
    VIBE_GIVEN,
    [{"op": "answer", "mode": "vibe-check",
      "answer": {"kind": "vibe-check", "mood": "Chill"}}],
    obs(["question"], currentRound=1, currentMode="vibe-check", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", False, 0)]),
    "src/components/game/modes/VibeCheckMode.tsx:121-128")

# ─── Survivor mode ──────────────────────────────────────────────────

SURVIVOR_GIVEN = {
    "config": {"selectedModes": ["survivor"]},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "question", "currentMode": "survivor",
    "currentSong": "s-a", "songs": {"s-a": SONG_A},
}

add("survivor/correct", "scoring.survivor",
    "A correct one-hit-wonder guess awards three points",
    SURVIVOR_GIVEN,
    [{"op": "answer", "mode": "survivor",
      "answer": {"kind": "survivor", "guessedOneHit": False}}],
    obs(["question"], currentRound=1, currentMode="survivor", currentSongId="s-a",
        playerScores={"p1": 3}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 3)]),
    "src/components/game/modes/SurvivorMode.tsx:46-53")

add("survivor/wrong", "scoring.survivor",
    "A wrong one-hit-wonder guess awards no points",
    SURVIVOR_GIVEN,
    [{"op": "answer", "mode": "survivor",
      "answer": {"kind": "survivor", "guessedOneHit": True}}],
    obs(["question"], currentRound=1, currentMode="survivor", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", False, 0)]),
    "src/components/game/modes/SurvivorMode.tsx:46-53")

add("survivor/cheat-penalty", "scoring.survivor",
    "The cheat that reveals the artist costs one point",
    dict(SURVIVOR_GIVEN, players=[player("p1", "Ada", score=5)]),
    [{"op": "cheat", "cheat": "survivor-artist"}],
    obs(["question"], currentRound=1, currentMode="survivor", currentSongId="s-a",
        playerScores={"p1": 4}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/components/game/modes/SurvivorMode.tsx:55-60; src/utils/mode-rules.ts")

# ─── Cover Confusion mode ───────────────────────────────────────────

COVER_GIVEN = {
    "config": {"selectedModes": ["cover-confusion"]},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "question", "currentMode": "cover-confusion",
    "currentSong": "s-b", "songs": {"s-b": SONG_B},
}

add("cover/no-hints", "scoring.cover-confusion",
    "Without a hint the Cover Confusion mode awards five points",
    COVER_GIVEN,
    [{"op": "answer", "mode": "cover-confusion",
      "answer": {"kind": "cover-confusion", "hintsUsed": 0, "pickedArtist": "Cover Artist"}}],
    obs(["question"], currentRound=1, currentMode="cover-confusion", currentSongId="s-b",
        playerScores={"p1": 5}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 5)]),
    "src/components/game/modes/CoverConfusionMode.tsx:96-102")

add("cover/two-hints", "scoring.cover-confusion",
    "After two hints the Cover Confusion mode awards three points",
    COVER_GIVEN,
    [{"op": "answer", "mode": "cover-confusion",
      "answer": {"kind": "cover-confusion", "hintsUsed": 2, "pickedArtist": "Cover Artist"}}],
    obs(["question"], currentRound=1, currentMode="cover-confusion", currentSongId="s-b",
        playerScores={"p1": 3}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 3)]),
    "src/components/game/modes/CoverConfusionMode.tsx:96-102")

add("cover/three-hints", "scoring.cover-confusion",
    "After three hints the Cover Confusion mode awards two points",
    COVER_GIVEN,
    [{"op": "answer", "mode": "cover-confusion",
      "answer": {"kind": "cover-confusion", "hintsUsed": 3, "pickedArtist": "Cover Artist"}}],
    obs(["question"], currentRound=1, currentMode="cover-confusion", currentSongId="s-b",
        playerScores={"p1": 2}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 2)]),
    "src/components/game/modes/CoverConfusionMode.tsx:96-102")

add("cover/wrong-artist", "scoring.cover-confusion",
    "The wrong artist awards no points",
    COVER_GIVEN,
    [{"op": "answer", "mode": "cover-confusion",
      "answer": {"kind": "cover-confusion", "hintsUsed": 0, "pickedArtist": "Somebody Else"}}],
    obs(["question"], currentRound=1, currentMode="cover-confusion", currentSongId="s-b",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", False, 0)]),
    "src/components/game/modes/CoverConfusionMode.tsx:96-102")

add("cover/variation-correct", "scoring.cover-confusion",
    "The variation \"cover or original?\" awards three points",
    COVER_GIVEN,
    [{"op": "answer", "mode": "cover-confusion",
      "answer": {"kind": "cover-confusion-variation", "guessCover": True}}],
    obs(["question"], currentRound=1, currentMode="cover-confusion", currentSongId="s-b",
        playerScores={"p1": 3}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", True, 3)]),
    "src/components/game/modes/CoverConfusionMode.tsx:104-110")

add("cover/variation-wrong", "scoring.cover-confusion",
    "The wrong answer of the variation awards no points",
    COVER_GIVEN,
    [{"op": "answer", "mode": "cover-confusion",
      "answer": {"kind": "cover-confusion-variation", "guessCover": False}}],
    obs(["question"], currentRound=1, currentMode="cover-confusion", currentSongId="s-b",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        answers=[answer("p1", False, 0)]),
    "src/components/game/modes/CoverConfusionMode.tsx:104-110")

# ─── Time decay ─────────────────────────────────────────────────────

DECAY_GIVEN = {
    "config": {"selectedModes": ["timeline"], "timelineMaxPoints": 5,
                "timeDecayEnabled": True, "timeDecayGraceSeconds": 5,
                "timeDecayStepSeconds": 5, "timeDecayStepPoints": 1,
                "minPointsPerCorrect": 1},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "question", "currentMode": "timeline",
    "timelineYears": [1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000],
    "currentSong": "s-c", "songs": {"s-c": dict(SONG_A, id="s-c", year=1992)},
}

add("decay/within-grace", "time-decay",
    "Within the grace period the answer keeps the full amount",
    DECAY_GIVEN,
    [{"op": "answer", "mode": "timeline",
      "answer": {"kind": "timeline", "slot": 7}, "answeredInSeconds": 3}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-c",
        playerScores={"p1": 5}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1960, 1965, 1970, 1975, 1980, 1985, 1990, 1992, 1995, 2000],
        answers=[answer("p1", True, 5, 3)]),
    "src/app/game/page.tsx:138-156; src/utils/mode-rules.ts")

add("decay/one-step", "time-decay",
    "Every decay step costs one point",
    DECAY_GIVEN,
    [{"op": "answer", "mode": "timeline",
      "answer": {"kind": "timeline", "slot": 7}, "answeredInSeconds": 12}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-c",
        playerScores={"p1": 4}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1960, 1965, 1970, 1975, 1980, 1985, 1990, 1992, 1995, 2000],
        answers=[answer("p1", True, 4, 12)]),
    "src/app/game/page.tsx:138-156; src/utils/mode-rules.ts")

add("decay/minimum", "time-decay",
    "The decayed amount never falls below the configured minimum",
    DECAY_GIVEN,
    [{"op": "answer", "mode": "timeline",
      "answer": {"kind": "timeline", "slot": 7}, "answeredInSeconds": 600}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-c",
        playerScores={"p1": 1}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1960, 1965, 1970, 1975, 1980, 1985, 1990, 1992, 1995, 2000],
        answers=[answer("p1", True, 1, 600)]),
    "src/app/game/page.tsx:138-156; src/utils/mode-rules.ts")

# ─── Teams ──────────────────────────────────────────────────────────

add("team/points-sync-to-team", "teams",
    "Points for a player with a team are added to the team as well",
    {"config": {"selectedModes": ["timeline"], "teamMode": "fixed"},
     "players": [player("p1", "Ada", team="t1")],
     "teams": [team("t1", "Team One", ["p1"])],
     "turnOrder": ["t1"], "currentRound": 1, "roundPhase": "question",
     "currentMode": "timeline"},
    [{"op": "awardPoints", "entityId": "p1", "points": 4}],
    obs(["question"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 4}, teamScores={"t1": 4},
        playerTeams={"p1": "t1"}, teamMembers={"t1": ["p1"]}, turnOrder=["t1"]),
    "src/stores/game-store.ts:451-476")

add("team/award-to-team-only", "teams",
    "Points for a team are added to the team only",
    {"config": {"selectedModes": ["timeline"], "teamMode": "fixed"},
     "players": [player("p1", "Ada", team="t1")],
     "teams": [team("t1", "Team One", ["p1"])],
     "turnOrder": ["t1"], "currentRound": 1, "roundPhase": "question",
     "currentMode": "timeline"},
    [{"op": "awardPoints", "entityId": "t1", "points": 4}],
    obs(["question"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, teamScores={"t1": 4},
        playerTeams={"p1": "t1"}, teamMembers={"t1": ["p1"]}, turnOrder=["t1"]),
    "src/stores/game-store.ts:451-476")

add("team/assign-player", "teams",
    "Assigning a player moves them into the team",
    {"config": {"selectedModes": ["timeline"], "teamMode": "fixed"},
     "players": [player("p1", "Ada")],
     "teams": [team("t1", "Team One"), team("t2", "Team Two")],
     "turnOrder": ["t1"], "currentRound": 1, "roundPhase": "question",
     "currentMode": "timeline"},
    [{"op": "assignPlayerToTeam", "playerId": "p1", "teamId": "t2"}],
    obs(["question"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, teamScores={"t1": 0, "t2": 0},
        playerTeams={"p1": "t2"}, teamMembers={"t1": [], "t2": ["p1"]},
        turnOrder=["t1"]),
    "src/stores/game-store.ts:572-592")

add("team/remove-team-clears-membership", "teams",
    "Removing a team clears the team of its members",
    {"config": {"selectedModes": ["timeline"], "teamMode": "fixed"},
     "players": [player("p1", "Ada", team="t1")],
     "teams": [team("t1", "Team One", ["p1"])],
     "turnOrder": ["t1"], "currentRound": 1, "roundPhase": "question",
     "currentMode": "timeline"},
    [{"op": "removeTeam", "teamId": "t1"}],
    obs(["question"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, teamScores={}, playerTeams={"p1": None},
        teamMembers={}, turnOrder=["t1"]),
    "src/stores/game-store.ts:561-569")

# ─── Errors ─────────────────────────────────────────────────────────

add("error/unknown-song-id", "errors",
    "A draw with an unknown song id is refused by the vector layer",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "drawing", "currentMode": "timeline", "songs": {}},
    [{"op": "drawSong", "songId": "does-not-exist"}],
    obs([], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        error={"code": "UNKNOWN_SONG",
               "message": 'the vector has no song "does-not-exist"'}),
    "tools/conformance/lib/harness.ts")

add("error/answer-without-current-song", "errors",
    "An answer without a drawn song is refused by the vector layer",
    {"config": {"selectedModes": ["vibe-check"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
     "roundPhase": "question", "currentMode": "vibe-check", "songs": {}},
    [{"op": "answer", "mode": "vibe-check",
      "answer": {"kind": "vibe-check", "mood": "Epic"}}],
    obs([], currentRound=1, currentMode="vibe-check",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        error={"code": "NO_CURRENT_SONG",
               "message": "the answer input needs a drawn song"}),
    "tools/conformance/lib/harness.ts",
    portable=False,
    note=("The error vocabulary of the vector layer belongs to the runner, "
          "not to the game: the two runners name the same failure "
          "differently. The situation is also one that only the reference "
          "can reach — the core cannot enter the question phase without a "
          "drawn song. The vector therefore documents the behaviour of the "
          "reference and is not compared."))

add("error/answer-without-player", "errors",
    "Without a current player no answer is recorded — the timeline still changes",
    dict(TIMELINE_GIVEN, turnOrder=[]),
    [{"op": "answer", "mode": "timeline", "answer": {"kind": "timeline", "slot": 2}}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=[],
        timelineYears=[1970, 1980, 1985, 1990], answers=[]),
    "src/app/game/page.tsx:136; src/components/game/modes/TimelineMode.tsx:235-250")

add("error/award-points-unknown-player", "errors",
    "Points for an unknown player are ignored — the reference stays silent",
    {"config": {"selectedModes": ["timeline"]},
     "players": [player("p1", "Ada", score=5)], "turnOrder": ["p1"],
     "currentRound": 1, "roundPhase": "question", "currentMode": "timeline"},
    [{"op": "awardPoints", "entityId": "does-not-exist", "points": 4}],
    obs(["question"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 5}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/stores/game-store.ts:462-463",
    portable=False,
    note=("The TypeScript reference ignores the operation silently "
          "(game-store.ts:463 `if (!player) return state`). The Rust core is "
          "required to return a typed error (CORE-111). The divergence is "
          "intentional: the core is stricter than the reference."))

add("error/remove-unknown-timeline-year", "errors",
    "Removing a year that is not on the timeline changes nothing",
    dict(TIMELINE_GIVEN),
    [{"op": "removeTimelineYear", "year": 1999}],
    obs(["question"], currentRound=1, currentMode="timeline", currentSongId="s-a",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        timelineYears=[1970, 1980, 1990]),
    "src/stores/game-store.ts:606-615",
    portable=False,
    note=("The TypeScript reference ignores the operation silently "
          "(game-store.ts:611 `if (idx === -1) return {}`). The Rust core is "
          "required to return a typed error (CORE-111). The divergence is "
          "intentional: the core is stricter than the reference."))

# ─── Catalogue selection ────────────────────────────────────────────

CATALOGUE_GIVEN = {
    "config": {"selectedModes": ["timeline"]},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "drawing", "currentMode": "timeline",
    "catalogue": CATALOGUE,
}

add("catalogue/pack-filter", "catalogue",
    "The pack filter selects only the songs of the pack",
    CATALOGUE_GIVEN,
    [{"op": "filterSongs", "options": {"selectedPacks": ["Rock Anthems"]}}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        filteredSongIds=["c1", "c2"]),
    "src/utils/song-picker.ts:36-41")

add("catalogue/difficulty-filter", "catalogue",
    "The difficulty filter narrows the pool further",
    CATALOGUE_GIVEN,
    [{"op": "filterSongs",
      "options": {"selectedPacks": ["Rock Anthems"], "difficulty": "easy"}}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        filteredSongIds=["c1"]),
    "src/utils/song-picker.ts:51-54")

add("catalogue/qr-filter", "catalogue",
    "The QR filter keeps only the songs that are on a physical card",
    CATALOGUE_GIVEN,
    [{"op": "filterSongs",
      "options": {"selectedPacks": ["Rock Anthems"], "onlyQRCompatible": True}}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        filteredSongIds=["c1"]),
    "src/utils/song-picker.ts:46-49")

add("catalogue/legacy-pack-alias", "catalogue",
    "A legacy pack id is mapped to the current pack — with the absolute fallback",
    CATALOGUE_GIVEN,
    [{"op": "filterSongs", "options": {"selectedPacks": ["global-hits"]}}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        filteredSongIds=["c1", "c2", "c3", "c4", "c5", "c6"]),
    "src/utils/song-picker.ts:12-15, 36-41")

add("catalogue/mode-filter", "catalogue",
    "The mode filter selects only the songs that support the mode",
    CATALOGUE_GIVEN,
    [{"op": "filterSongs", "options": {"currentMode": "vibe-check"}}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        filteredSongIds=["c1", "c4", "c5"]),
    "src/utils/song-picker.ts:56-70")

add("catalogue/lyrics-hard-fallback", "catalogue",
    "The lyrics mode falls back to the pack pool when it holds songs with lyrics",
    CATALOGUE_GIVEN,
    [{"op": "filterSongs",
      "options": {"selectedPacks": ["Rock Anthems"], "currentMode": "lyrics"}}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        filteredSongIds=["c2"]),
    "src/utils/song-picker.ts:56-70")

add("catalogue/difficulty-filter-soft-fallback", "catalogue",
    "The difficulty filter is ignored when it would empty the pool",
    CATALOGUE_GIVEN,
    [{"op": "filterSongs",
      "options": {"selectedPacks": ["Rock Anthems", "80s Flashback"],
                  "onlyQRCompatible": True, "difficulty": "hard"}}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        filteredSongIds=["c1", "c3"]),
    "src/utils/song-picker.ts:43-54")

add("catalogue/qr-filter-soft-fallback", "catalogue",
    "The QR filter is ignored when it would empty the pool",
    CATALOGUE_GIVEN,
    [{"op": "filterSongs",
      "options": {"selectedPacks": ["Metal & Hardcore"], "onlyQRCompatible": True}}],
    obs(["drawing"], currentRound=1, currentMode="timeline",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        filteredSongIds=["c6"]),
    "src/utils/song-picker.ts:43-49")

# ─── Hint censorship ────────────────────────────────────────────────

SPOILER_GIVEN = {
    "config": {"selectedModes": ["hint-master"]},
    "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 1,
    "roundPhase": "question", "currentMode": "hint-master",
}

add("spoiler/censor-artist-token", "spoiler",
    "A hint that names the artist is censored",
    SPOILER_GIVEN,
    [{"op": "censorHint", "hint": "A song by The Example from the eighties",
      "artist": "The Example", "title": "Example Song"}],
    obs(["question"], currentRound=1, currentMode="hint-master",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        censorHint="A [XXX] by The [XXX] from the eighties"),
    "src/utils/censor-utils.ts:11-60")

add("spoiler/censor-short-token", "spoiler",
    "A token shorter than four characters is not censored",
    SPOILER_GIVEN,
    [{"op": "censorHint", "hint": "A song by AB from the seventies",
      "artist": "AB", "title": "Hi"}],
    obs(["question"], currentRound=1, currentMode="hint-master",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        censorHint="A song by AB from the seventies"),
    "src/utils/censor-utils.ts:34; src/config/spoiler-config.ts")

add("spoiler/censor-exception-token", "spoiler",
    "A short artist from the exception list is censored anyway",
    SPOILER_GIVEN,
    [{"op": "censorHint", "hint": "A song by U2 from the eighties",
      "artist": "U2", "title": "Vertigo"}],
    obs(["question"], currentRound=1, currentMode="hint-master",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        censorHint="A song by [XXX] from the eighties"),
    "src/utils/censor-utils.ts:21-23; src/config/spoiler-config.ts")

add("spoiler/censor-ignore-word", "spoiler",
    "A word of the ignore list is never censored",
    SPOILER_GIVEN,
    [{"op": "censorHint", "hint": "The Beatles need your help",
      "artist": "The Beatles", "title": "Help"}],
    obs(["question"], currentRound=1, currentMode="hint-master",
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"],
        censorHint="The [XXX] need your [XXX]"),
    "src/utils/censor-utils.ts:31-32; src/config/spoiler-config.ts")

# ─── Divergences that are not portable ──────────────────────────────

add("divergence/mode-rotation-random", "divergence",
    "The mode rotation is random — with two modes the result is not predictable",
    {"config": {"selectedModes": ["timeline", "vibe-check"]},
     "players": [player("p1", "Ada")], "turnOrder": ["p1"], "currentRound": 0,
     "roundPhase": "drawing", "currentMode": "timeline"},
    [{"op": "startGame"}],
    obs(["drawing"], currentRound=1,
        playerScores={"p1": 0}, playerTeams={"p1": None}, turnOrder=["p1"]),
    "src/stores/game-store.ts:188-191",
    portable=False,
    note=("The mode rotation draws from `Math.random()` (game-store.ts:190). "
          "The Rust core uses a seeded generator (CORE-113), but a seeded "
          "generator with a different algorithm produces a different "
          "sequence. The vector therefore uses a single mode in every "
          "portable case; the rotation itself is not comparable until the "
          "owner defines a shared algorithm and seed."))

add("divergence/shifting-teams-random", "divergence",
    "The shifting team mode re-shuffles the teams — the membership is random",
    {"config": {"selectedModes": ["timeline"], "teamMode": "shifting",
                "endingCondition": "rounds", "targetRounds": 30},
     "players": [player("p1", "Ada", score=5, team="t1"),
                 player("p2", "Bo", score=3, team="t2"),
                 player("p3", "Cyd", team="t1")],
     "teams": [team("t1", "Team One", ["p1", "p3"], score=5),
               team("t2", "Team Two", ["p2"], score=3)],
     "turnOrder": ["t1", "t2"], "currentTurnIndex": 1, "currentRound": 1,
     "roundPhase": "reveal", "currentMode": "timeline"},
    [{"op": "nextRound"}],
    obs(["drawing"], currentRound=2,
        playerScores={"p1": 5, "p2": 3, "p3": 0},
        teamScores={"t1": 5, "t2": 3}, turnOrder=["t1", "t2"], currentTurnIndex=0),
    "src/stores/game-store.ts:349-363",
    portable=False,
    note=("The shifting team mode re-shuffles the players with "
          "`Math.random()` (game-store.ts:353). The membership of the teams "
          "after the switch is therefore not predictable — and the reference "
          "keeps the points of the teams and the players (deviation A8). "
          "The vector records the score behaviour, which is deterministic; "
          "the membership is not part of the observation."))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = {"schemaVersion": 1, "vectors": []}
    seen = set()
    for vector in VECTORS:
        assert vector["id"] not in seen, vector["id"]
        seen.add(vector["id"])
        file_name = vector["id"].replace("/", "-") + ".json"
        path = OUT / file_name
        path.write_text(json.dumps(vector, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf8")
        index["vectors"].append({
            "id": vector["id"], "file": file_name, "area": vector["area"],
            "title": vector["title"], "portable": vector["portable"],
        })
    (OUT / "index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print(f"{len(VECTORS)} vectors written to {OUT}")
    portable = sum(1 for v in VECTORS if v["portable"])
    print(f"portable: {portable}, documented divergences: {len(VECTORS) - portable}")


if __name__ == "__main__":
    main()
