# ADR-0006 — Binding Platform Track Order

**Status:** Proposed
**Date:** 2026-10-25
**Owner role:** Chief Architect
**Related requirement IDs:** CORE-004, CORE-006, CORE-010, GAME-001, GAME-013, MEDIA-001, MEDIA-004, NFR-005

> **Language note.** This ADR is written in English, as required by the work
> order that produced it. ADR-0001 to ADR-0004 are German. See
> [`../../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
> §15, open decision **O-10**.

---

## Context

### The decision to be made

The product becomes a family of apps. The target platforms are known. What is
**not** known — and what this ADR decides — is the order in which they are
built, and whether that order is binding.

The candidate order is:

1. **Android** (phone and tablet)
2. **Google TV / Fire TV**
3. **macOS and Linux**
4. **iPadOS and iOS**
5. **Windows and further operating systems**

### This is a product and resource decision, not a technical one

The order does not follow from the technology. Every platform is technically
reachable with the same base and the same bridges. The order follows from
three things:

**The resources are finite and singular.** There is one team, one review
capacity, one base, one bridge and one release pipeline to build. Five
platform tracks in parallel would mean five partial implementations of the
same bridge, five partial sets of conformance vectors, and five partial
quality gates — none of which would be complete enough to ship.

**The tracks have very different risk profiles.** The two largest unknowns are
not "can we build an Android app" — that is routine — but:

- **Can a TV shell play the music at all?** The YouTube IFrame Player API is
  a browser API, there is no general-purpose browser on Google TV or Fire TV,
  and the former Android Player API was deprecated in 2023 and removed from
  the YouTube policies on 2025-01-23
  (<https://developers.google.com/youtube/terms/revision-history>). Whether a
  WebView-hosted embed satisfies the YouTube rules on a TV is **unverified**.
- **Can the iOS shell ship at all?** The repository is licensed GPL-3.0
  ([`../../package.json`](../../package.json):4), and the App Review
  Guidelines state that streaming third-party media may violate the service's
  terms and must be checked beforehand, and that Apple Music or iTunes preview
  content must not be used for entertainment purposes — naming game
  soundtracks as an example
  (<https://developer.apple.com/app-store/review/guidelines/>). Neither the
  licence question nor the provider question has an answer yet.

**The tracks teach each other.** The first native track proves the bridge,
the packaging, the release pipeline and the conformance replay. The second
proves that the bridge survives a fundamentally different form factor. The
later tracks then reuse proven machinery instead of discovering it in
parallel.

**The web client is not a track.** It exists today. It is not "the easiest
platform" that has to be scheduled — it is the first *consumer* of the base
that has to be built, and it is where the base is proven before four more
shells depend on it
([`../../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
§5.3).

### The forces that constrain the order

| Force | Consequence |
|---|---|
| one team, one review capacity | no parallel tracks |
| the media feasibility on a TV is unknown | it must be retired early, not last |
| the Apple guidelines and the GPL question are unresolved | iOS must not be first, and must not start before the legal answer exists |
| the desktop shell is the cheapest but proves the least | it is not first |
| the Android shell proves the bridge for the widest set of later tracks | it is first |
| the base must be proven before it is multiplied | the web shell adopts the base before the native tracks begin |

---

## Decision

### 1. The order is binding

```text
1. Android        (phone and tablet)
2. Google TV / Fire TV
3. macOS and Linux
4. iPadOS and iOS
5. Windows and further operating systems
```

### 2. The gate between two tracks

> **A platform track starts only when the previous track has a green release
> candidate.**

"Green release candidate" means:

| Criterion | Meaning |
|---|---|
| the release candidate is built and installable on the target platform | not a debug build, not a developer build |
| the conformance vectors are replayed on that shell and produce byte-identical output to the base | the shell is not a second implementation |
| the shell's own E2E passes: lobby → a full round → reveal → next round → game over | the shell is playable, not merely buildable |
| the acceptance evidence exists in [`../../docs/acceptance/`](../../docs/acceptance/) in the format of [`ACCEPTANCE_TEMPLATE.md`](../../docs/acceptance/ACCEPTANCE_TEMPLATE.md) | the track is signed off, not merely finished |
| the track's own release pipeline produces a signed artefact | the release is real |

A track that is "90 % done" does not start the next one. The point of the
order is to retire risk, and a half-finished track retires no risk.

### 3. The base is not a track

The Rust base, the bridges and the boundary gate are the **prerequisite** of
every track, not a track themselves. They are built first, and the web shell
is their first consumer. A track starts when the base is available and the
previous track is green.

### 4. Deviations require an ADR

Any deviation — starting a track early, swapping two tracks, adding a
platform outside the list — requires an ADR that supersedes or amends this
one, with the reason stated. A deviation that is not written down is a
violation.

### 5. The platform differences are gaps, not special cases

The order does not change the architecture: every platform difference is a
capability value that the shell reports and the base reacts to
([`../../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
§7). A track may not introduce a platform branch inside a rule.

---

## Consequences

### Positive

- **One milestone plan, not five.** The plan has one moving part at a time.
  The cost of a mistake is one track's cost, not five tracks' cost.
- **The biggest unknown is retired in track 2.** The TV media feasibility is
  the riskiest technical question in the programme. In a parallel programme it
  would be discovered in track 5, when the cost of changing course is
  highest.
- **The bridge is proven before it is multiplied.** Four native shells depend
  on the UniFFI bindings; if the bindings are wrong, the mistake is made once
  instead of four times.
- **The maintenance cost is incurred sequentially.** Seven shells are seven
  release pipelines, seven signing identities and seven update channels. In
  sequence, each one is financed by the previous one; in parallel, the cost
  is incurred five times over.
- **The base is proven in the shell that already exists.** The web shell is
  the only shell with a user base today; it is the cheapest place to find the
  base's defects.
- **The release cadence is regular.** Each track produces a shippable
  artefact, so the product has a release every time a track closes.

### Negative / Trade-offs

- **The Windows users wait the longest.** Windows is the last track, and
  there is no technical reason for it to be. The reason is capacity.
- **The iOS users wait even though iOS is a large mobile market.** The
  licence and provider questions have to be answered first, and the iOS shell
  is also the most expensive to build and to keep compliant.
- **The order is not market-optimal.** A market-driven order would probably
  put iOS before Google TV. This order is driven by risk, not by market
  share.
- **Each track teaches the next one that the previous one was partly wrong.**
  The TV track will find things about the 10-foot form factor that the phone
  track got wrong, and the desktop track will find things about the bridge
  that the phone track did not exercise. That rework is the price of the
  order, and it is smaller than the rework of five parallel tracks.
- **A stalled track stalls everything.** The sequence has no slack. If the
  TV track stalls, macOS/Linux waits. A parallel programme would have kept
  three tracks moving — at three times the cost and none of the finished
  tracks.
- **The order constrains the Owner.** Changing it later is expensive in
  planning, even when it is cheap in code.

### What the decision makes impossible

- **Starting a platform track before the previous one is green.**
- **Running the tracks in parallel.**
- **Starting the iOS/iPadOS track before the licence and provider questions
  are answered** (open decision **O-3** in
  [`../../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
  §15).
- **Treating the web client as the first platform track.** It is not a
  track; it is the first consumer of the base.
- **Introducing a platform-specific rule** to make a later track work.

---

## Alternatives considered

- **Parallel tracks.** *Rejected:* one team, one bridge, one review capacity
  and one base. Five parallel tracks would produce five half-finished bridges
  and no finished product. The risk that the bridge turns out to be wrong
  would be discovered five times over instead of once.

- **The web client as the first and "easiest" track.** *Rejected:* the web
  client already exists and is not a new platform. Scheduling it as a track
  would deliver nothing that is not already delivered and would delay the
  proof of the bridge by one track. The web client nevertheless **is** the
  first consumer of the base, because that is where the base's defects are
  cheapest to find — but that is base work, not a platform track.

- **Windows first.** *Rejected:* the desktop shell is the cheapest to build
  and the least informative to prove. It uses a direct Cargo dependency, so
  it does not exercise the UniFFI bridge at all — and the bridge is what four
  later tracks depend on. A first track that proves the least of the
  architecture is the wrong first track.

- **iOS first.** *Rejected:* it is the track with the highest legal and
  provider risk (the App Review Guidelines, the GPL question, the absence of
  a verified media path). Starting with it would let an unresolved legal
  question block the entire programme, and the first track would be the one
  most likely to be rejected on review.

- **The TV track first.** *Rejected:* the TV shell is the one form factor
  whose media path is unverified, and it is also the form factor that
  depends most on the phone track having already established the packaging
  and the release pipeline. The TV question is retired in track 2, where it
  is still cheap to answer.

- **An order decided by market size.** *Rejected:* it would put iOS first and
  would let an unanswered legal question gate everything. Risk order beats
  market order when the product has one implementation to preserve.

---

## Verification

| Check | Command / place |
|---|---|
| the release candidate of the previous track is green | the acceptance evidence in [`../../docs/acceptance/`](../../docs/acceptance/), in the format of [`ACCEPTANCE_TEMPLATE.md`](../../docs/acceptance/ACCEPTANCE_TEMPLATE.md) |
| the track's shell replays the conformance vectors identically | the conformance runner of the track, per shell |
| the track's E2E passes | the per-shell E2E of the track |
| the track produces a signed artefact | the track's release pipeline |
| no platform branch exists inside a rule | the source scan in the boundary gate; the capability rule in [`../../design/BUILD-CONTRACT.md`](../design/BUILD-CONTRACT.md) §1.2 |
| a deviation is written down | an ADR that amends or supersedes this one |
