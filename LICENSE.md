# Licence notes

Phomu is licensed under the **GNU Affero General Public License, version 3 or
later** — **AGPL-3.0-or-later**. The full licence text is in
[`LICENSE`](LICENSE).

This file explains three things that the licence text itself cannot: what
changed, what the AGPL adds over the GPL, and how the distribution channels are
handled.

---

## 1. What changed, and when

| Date | Change |
|---|---|
| 2026-10-25 | The project moved from **GPL-3.0-or-later** to **AGPL-3.0-or-later** by owner decision. |

The change is **not** a relicensing of the work by its contributors. It is the
adoption of a licence that the work was already compatible with, plus one
obligation that the GPL does not have. The copyright position of the
contributors is unchanged.

Every file that carries the licence metadata says the same thing:

| Where | What it says |
|---|---|
| [`LICENSE`](LICENSE) | the full AGPL-3.0 text plus the project notice |
| [`package.json`](package.json) | `"license": "AGPL-3.0-or-later"` |
| [`Cargo.toml`](Cargo.toml) | `license = "AGPL-3.0-or-later"` (inherited by every crate) |

---

## 2. What the AGPL adds over the GPL: §13

The AGPL is the GPL plus one rule.

> **§13 Remote Network Interaction.** If you modify the program and let users
> interact with it over a network, you must offer those users the **complete
> corresponding source** of the version they are interacting with.

**How Phomu satisfies it:**

- The **web shell** is a static client. There is no server-side component that
  runs a modified version of the program; the deployed artefact is a static
  export of the code in this repository. The source of the deployed version is
  therefore the source in the repository, and the application links to it in
  the legal pages.
- The **native shells** (Android, TV, macOS, Linux, iOS/iPadOS, Windows) ship
  the source alongside the binary, which is what §13 asks for as well.
- **If a server is ever added** that runs Phomu code — a session service, a
  synchronisation endpoint, a hosted catalogue — §13 applies to it in full: the
  source of the running server must be offered to every user who interacts with
  it. The platform tracks are specified with that in mind; see
  [`docs/design/PLATFORM-ARCHITECTURE.md`](docs/design/PLATFORM-ARCHITECTURE.md).

---

## 3. The distribution channels

| Channel | Under AGPL-3.0-or-later? |
|---|---|
| Web (static export on GitHub Pages) | Yes — the source is published and linked |
| Android, Google TV / Fire TV (Google Play) | Yes — with the §7 additional permission, see below |
| macOS, Linux, Windows (own distribution) | Yes — the source travels with the binary |
| iOS / iPadOS (App Store, TestFlight) | Only with the §7 additional permission, see below |

### The Phomu App Store Exception

The App Store's terms and its DRM are, read literally, further restrictions on
the recipients of the covered work. AGPL §10 forbids a distributor from
imposing such further restrictions.

The project therefore grants **one** additional permission under **§7**: the
permission to convey the covered work through third-party application
distribution services — the Apple App Store, Google Play and alternative app
marketplaces — notwithstanding those services' terms of service, usage rules
and digital distribution requirements, **provided that the complete
corresponding source of the conveyed work remains available to its users as the
licence requires**.

The permission removes **only** the distribution-channel conflict. It does not
touch the source-availability obligation, the licence-notice obligation, or the
prohibition on further restrictions.

The full analysis, with 45 cited sources, is in
[`docs/licensing/APPLE-LICENSING.md`](docs/licensing/APPLE-LICENSING.md); the
decision is recorded in
[`docs/adr/ADR-0007-apple-distribution-and-licensing-strategy.md`](docs/adr/ADR-0007-apple-distribution-and-licensing-strategy.md).

---

## 4. What is **not** covered by the licence

The licence covers the **software**. It does not cover the **content**:

- the music tracks, the cover images and the video links in the catalogue
  belong to third parties; the project distributes the software, not the
  content
- the playback happens through the official embeds of YouTube, Spotify, Amazon
  Music and Apple Music; their terms apply to that interaction, and Phomu
  neither controls nor stores the data it produces
- the play of a party in a private or educational setting is covered by the
  fair-use principle; see the terms in the application

---

## 5. For contributors

By contributing you accept that your contribution is licensed under
AGPL-3.0-or-later, and that the §7 additional permission above applies to it.
The full text is in [`CONTRIBUTING.md`](CONTRIBUTING.md). If you disagree with
the App Store exception, §7 lets every contributor grant the permission
without it — the permission is revocable per copy and per contribution.
