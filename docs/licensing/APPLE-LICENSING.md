# Apple Platform Licensing and Distribution Strategy

**Project:** Phomu — hybrid music party game
**Repository:** <https://github.com/mazer666/Phomu>
**Status:** Draft decision basis for the owner (not yet a ratified decision)
**Date:** 2026-10-25
**Language:** English (see [§10.2](#102-language-note))

> **This document is not legal advice.** Every legal statement below is a
> restatement of publicly available sources, followed by an explicit
> interpretation and, where appropriate, a recommendation. Where public
> sources do not settle a question, the document says so instead of guessing.
> Numbers (costs, limits, dates) are quoted from a source and carry a source
> tag; anything that could not be verified is marked **to be verified**.

---

## 0. How to read this document

Three kinds of statement are mixed here and each one is labelled:

| Label | Meaning |
|---|---|
| **Fact** | Directly quoted or directly stated by a cited public source, or measured in this repository. |
| **Interpretation** | A reading of those sources. Reasonable people can differ. Not legal advice. |
| **Recommendation** | A proposal from this document. The owner decides. |

Source tags `[S1]`…`[S44]` refer to [§11 Sources](#11-sources). Repository
references `[R1]`…`[R7]` refer to [§12 Repository evidence](#12-repository-evidence).
All external sources were retrieved on **2026-10-25**.

### 0.1 A correction to the premise this document was asked to evaluate

The brief this document answers described an App Review Guideline **"4.7
(Minimize Swift)"** and asked how Apple's Swift requirement interacts with a
Rust + UniFFI core.

**Fact.** Guideline 4.7 of the App Review Guidelines is titled *"Mini apps, mini
games, streaming games, chatbots, plug-ins and game emulators"* and governs
software that is **not embedded in the app binary** — HTML5/JS mini apps, mini
games, streaming games, chatbots, plug-ins and retro emulator downloads
[S32][S33]. There is **no** guideline numbered 4.7 titled "Minimize Swift".

**Fact.** The App Review Guidelines do not contain a requirement that an app be
written in Swift. They constrain behaviour and API use (2.5.1 "public APIs
only", 2.5.2 "self-contained"), design (4.2 Minimum Functionality) and legal
exposure (5.2) [S32]. The *toolchain* requirement that actually binds is
different and is hard: since **2026-04-28** uploads to App Store Connect must
be built with **Xcode 26 or later** using the **iOS 26 / iPadOS 26 SDK or
later** [S34].

**Consequence for Phomu.** A Rust core behind a UniFFI bridge is **not** in
conflict with any App Review Guideline. The real Swift-related constraint is
the SDK floor, which affects the Xcode/Rust toolchain pairing, not the
implementation language of the UI layer. Section [6](#6-the-rust-specific-part)
treats this correctly.

---

## 1. The problem in two sentences

Phomu is licensed AGPL-3.0-or-later [R1], and the Apple App Store imposes usage
rules and DRM on every app delivered through it — the combination the Free
Software Foundation identified as incompatible with the GPL in 2010 and that the
VLC project had to resolve by relicensing in order to return to the store
[S1][S2][S3][S7]. The App Store is nevertheless the only distribution channel
for iOS/iPadOS with global reach, so Phomu must decide **before** building the
Apple track whether it wants to grant the narrow licence permission that makes
App Store distribution lawful, and what happens to the track if the owner never
acquires an Apple Developer account.

---

## 2. Legal framework

### 2.1 What AGPL-3.0-or-later permits

**Terminology.** The heading of AGPL-3.0 §7 is *"Additional Terms"* [S9]; the FSF
and the GPL FAQ refer to the same mechanism as an *"additional permission under
section 7"* [S10]. Both names are used below; they mean the same thing.

**Fact.** AGPL-3.0 §7 ("Additional Terms") permits the copyright holders to
supplement the licence: *"Additional permissions" are terms that supplement the
terms of this License by making exceptions from one or more of its
conditions*; they may be stated *"in the form of a separately written license,
or stated as exceptions"* [S9].

**Fact.** AGPL-3.0 §7 also states that *"All other non-permissive additional
terms are considered 'further restrictions' within the meaning of section 10"*
and that *"If the Program as you received it, or any part of it, contains a
notice stating that it is governed by this License along with a term that is a
further restriction, you may remove that term"* [S9]. The copyright holder can
therefore waive a restriction imposed by a third party's terms.

**Fact.** AGPL-3.0-or-later §10 forbids imposing further restrictions on the exercise of
the rights granted; the FSF's analysis of the App Store conflict rests on that
clause and states that it *"prevents distributors from using separate legal
agreements, like Terms of Service or NDAs, to take away the freedoms that the
license is supposed to grant"* [S2].

**Fact.** The FSF's own FAQ documents the §7 mechanism as the way to make a
GPL program work in a distribution channel whose terms would otherwise
conflict, and explains that *"Notwithstanding any other provision of this
License"* means that the additional permission prevails over conflicting terms
[S10].

### 2.2 What the App Store imposes

**Fact.** Apple's current Standard EULA for App Store apps states that a user
*"may not copy (except as permitted by this license and the Usage Rules),
reverse-engineer, disassemble, attempt to derive the source code of, modify,
or create derivative works of the Licensed Application, any updates, or any part
thereof (except as and only to the extent that any foregoing restriction is
prohibited by applicable law or **to the extent as may be permitted by the
licensing terms governing use of any open-sourced components included with the
Licensed Application**)"* [S11].

**Fact.** Apple's own developer schedules allow a developer to deliver a
**custom EULA** instead of Apple's standard one, provided it is not
inconsistent with minimum terms and complies with applicable law
[S12]; App Store Connect exposes this as the "License Agreement" field of the
app's App Information [S12].

**Fact.** App Store binaries are encrypted with Apple's FairPlay DRM; the
`__TEXT` segment is encrypted (`cryptid 1`) and the decryption key is bound to
the device and the user's Apple Account [S17][S18].

**Fact.** Apple's Usage Rules historically limited installation to a fixed
number of devices and required acceptance of Apple's terms of service; the FSF
identified those rules as *"exactly the kind of 'further restrictions' that are
prohibited by the GPL"* [S2].

### 2.3 The historical record

**Fact.** On 2010-05-25 the FSF wrote to Apple about an iPhone port of GNU Go
distributed through the App Store, stating that Apple's terms of service
impose restrictions forbidden by the GPL; Apple removed GNU Go rather than
change its terms [S1][S2].

**Fact.** On 2010-10-29 the FSF published VLC developer Rémi Denis-Courmont's
complaint that the App Store's usage rules contradict the GPL's conditions and
prohibit users from sharing the program [S3].

**Fact.** In a 2011 interview, Columbia Law professor and FSF general counsel
Eben Moglen answered *"Yes"* to whether GPLv3 programs could be distributed
through the App Store, on the grounds that Apple requires each app sold to be
licensed for use on a single device only and that copylefted software cannot be
un-freely relicensed; FSF licensing compliance engineer Brett Smith agreed,
citing the last paragraph of section 10 [S4]. LWN's contemporaneous analysis
applied the same reasoning clause by clause [S5].

**Fact.** VLC for iOS was pulled from the App Store in January 2011. In October
2011 the VLC project relicensed the library from GPLv2 to LGPLv2 for
compatibility; in July 2013 the application was resubmitted under the Mozilla
Public License [S7][S8].

**Fact.** Wikipedia's summary of the issue distinguishes the two cases: the
Mac App Store is not inherently incompatible with GPL apps because of the
concept of an app store, but *"the incompatibility is due specifically to
Apple's terms-of-use requirement — that all apps in the store utilize Apple
DRM restrictions"* [S6].

**Fact.** A widely cited 2012 assessment titled *"Does Apple violate the
GPL?"* **could not be located at a primary source during this research.** The
Software Freedom Law Center's 2012 blog archive contains no post with that
title; the FSF licensing blog index could not be retrieved during this
research. The verifiable record is the material cited as [S1]–[S8] above.
*Do not cite a 2012 "Does Apple violate the GPL?" piece as a source without
re-verifying it independently.*

### 2.4 Where the line runs

**Interpretation.** The conflict is **not** "GPL vs. Apple". It is
*narrower and more precise*:

1. The GPL permits anyone to run, study, modify and redistribute the covered
   work [S9].
2. The App Store's Terms of Service, Usage Rules and FairPlay DRM impose legal
   and technical restrictions on the recipient that go beyond the GPL's
   permissions [S1][S2][S4][S17].
3. AGPL-3.0-or-later §10 forbids a distributor from imposing such further restrictions
   [S2]; §7 lets the copyright holder waive them [S9][S10].

**Interpretation.** The decisive legal question is therefore **who holds the
copyright**. If Phomu's copyright holder grants the §7 additional permission,
the App Store terms are no longer "further restrictions" for that work. If some
contributor has not granted it, that contributor can enforce the GPL against
App Store distribution of the combined work — which is exactly the mechanism
that removed VLC from the store [S3][S7].

**Interpretation — where it is genuinely unsettled.** Whether Apple's FairPlay
binary encryption can be reconciled by a §7 permission alone is **not settled
in any public source consulted here**. The FSF's framing treats DRM as the
core problem [S2], and VLC's resolution was to relicense the *library* rather
than to seek an exception [S7]. The counter-argument is visible in Apple's own
Standard EULA, which carves out the restrictions that the terms of an included
open-source component permit [S11], and in the existence of a working §7
app-store exception pattern [S13][S14].

**Interpretation.** A §7 permission is therefore a **well-trodden, legally
recognised mechanism with a real residual dispute**, not a silver bullet. It
is the mechanism used by Signal, Haven and Litter [S13][S14]. Phomu should
treat it as the best available route, not as a guarantee.

**Not legal advice.** A qualified lawyer should review the final exception
text before Phomu publishes or relies on it. This document does not replace
that review and does not claim to.

---

## 3. The channel map

Reach figures are Apple's own published limits. "Account" means an Apple
membership, not an Apple Account.

| Channel | Compliant with AGPL-3.0-or-later? | Reach | Account needed? | Effort | Risk |
|---|---|---|---|---|---|
| **Apple App Store** (public) | **Only with** a AGPL-3.0 §7 additional permission from every copyright holder. Without it: not compliant [S1][S2][S4][S9] | Global; the only channel with worldwide iOS/iPadOS reach | Apple Developer Program — **99 USD/yr** [S19][S20] | **High** — native app + Rust core + review + annual maintenance | **Medium** — copyright/consent position, App Review 4.2 [S32], possible takedown if a rights holder objects [S3][S7] |
| **TestFlight** (beta, Apple-distributed) | Same legal situation as the App Store: Apple is the distributor and the Usage Rules apply. The exception is required **before upload**, not before submission | Up to **100 internal** testers; up to **10,000 external** testers per app; **100** builds shareable; **30** devices per tester; builds expire after **90 days**; up to **6** builds into Beta App Review per 24 h [S25][S26][S27] | Same 99 USD/yr [S19] | **Medium** — same build pipeline, plus Beta App Review | **Medium** — same as App Store; first build of each version is reviewed [S25] |
| **EU alternative app marketplace** (AltStore PAL, Epic Games Store, Aptoide) | *Interpretation:* the App Store Usage Rules do not bind apps distributed here, and notarization is a signing/scan step rather than DRM [S29] — so GPL delivery is plausible **without** an exception. **Not settled in public sources.** | **EU only**; requires an EU Apple Account and EU residency [S28] | 99 USD/yr + Apple's authorisation criteria [S19][S28] | **Medium–High** — notarisation, entitlement, marketplace onboarding | **High** — Apple's authorisation criteria are hard to meet for an individual (see below) |
| **EU Web Distribution** (direct from the project's own website) | *Interpretation:* the developer distributes to the user directly under the GPL, so no third-party further restriction is imposed. **Not settled in public sources.** | **EU only**; minimum **iOS 17.5 / iPadOS 18** [S29] | 99 USD/yr + Apple's authorisation criteria [S19][S28] | **High** — notarisation, web distribution entitlement, own hosting | **High** — eligibility criteria (below) |
| **Ad-hoc distribution** (signed IPA to named UDIDs) | **Yes.** No third party imposes further restrictions; the developer signs and hands over the build | **100 devices per product family per membership year** (iPhone, iPad, Mac, …); the device slots reset at the start of each membership year [S23] | 99 USD/yr [S19] | **Low–Medium** — UDID collection, yearly re-signing | **Low** legal risk; **High** operational friction |
| **Sideloading with a free Apple Account** (Personal Team) | **Yes.** No third-party terms at all | **3 device registrations** and **up to 3 apps per device**, both **expiring after 7 days**; up to **10 App IDs**, also 7 days; provisioning profiles expire **7 days** from issuance [S22] | **No paid account** | **Low** | **Low** legal risk; **useless as distribution** (7-day expiry, 3 devices) |
| **Apple Developer Enterprise Program** | Not applicable — and using it for public distribution of an open-source app would breach the program's terms | Unlimited employees | **299 USD/yr**, **100+ employees**, a legal entity, proprietary in-house apps for employees only, plus a verification interview [S24] | n/a | **Disqualifying** for Phomu |
| **App Store Connect "Custom Apps"** (Apple Business Manager) | Same legal situation as the App Store | Named business customers only | 99 USD/yr [S19] | Medium | Medium; narrow audience |

### 3.1 Why the EU channels do not currently help Phomu

**Fact.** The obligation itself is not in doubt: Article 6(4) DMA requires
gatekeepers to allow developers to distribute apps outside their app stores,
and the European Commission's own developer portal describes the EU routes as
a direct consequence of that article [S30].

**Fact.** Apple's EU business terms, updated 2026-08-18 and effective
2026-10-01, replaced the Core Technology Fee with a **5% Core Technology
Commission** on digital transactions in apps distributed outside the App Store,
removed the Initial Acquisition Fee and the Store Services Fee, and — for
operating an alternative app marketplace or using Web Distribution — expanded
eligibility so that a legal entity or EU establishment is no longer by itself
required [S28].

**Fact.** The same page states that authorisation still requires **at least
one** of: a moderate Dun & Bradstreet financial-stability score; being publicly
traded or owned by one; venture funding from an established investment firm; a
financial audit by a licensed accountant; being a government entity,
educational institution or non-profit approved for a fee waiver; a stand-by
letter of credit of **USD 1,000,000**; or **one million first annual installs**
worldwide [S28].

**Fact.** The European Commission reported preliminary findings that Apple's
Core Technology Fee had disincentivised developers from using alternative
distribution, that its eligibility requirements were overly strict, and that
the user journey for installing alternatively distributed apps was overly
burdensome [S31].

**Interpretation.** A solo open-source maintainer plausibly satisfies **none**
of the seven criteria in [S28]. The EU routes therefore cannot carry the Apple
track today. The one criterion that could realistically be unlocked is
*"government entity, educational institution, or non-profit approved for a fee
waiver"* — i.e. forming a non-profit or hooking into an educational
institution. That is a **business/registry decision for the owner**, not a
licensing decision, and it is listed as an open decision in [§9](#9-open-decisions-for-the-owner).

---

## 4. Recommended strategy

### 4.1 The recommendation

> **Recommendation.** Keep the entire Phomu codebase under **AGPL-3.0-or-later**
> and add exactly one narrowly-scoped **AGPL-3.0 §7 additional permission** —
> the *Phomu App Store Exception* — that permits conveying the covered work
> through app-store channels (Apple App Store, Google Play, and alternative
> app marketplaces) notwithstanding those channels' DRM and usage rules, while
> leaving every copyleft obligation (complete corresponding source, licence
> notices, no additional restrictions) fully intact.
>
> Build the Apple track as a **native iOS/iPadOS app on a shared Rust core**
> and ship it through the App Store, with **TestFlight as the first
> distribution step** and the **existing web app as the primary and
> fallback channel** that keeps working with no Apple account at all.
>
> Do **not** relicense the core, do **not** dual-license, and do **not** use
> the Enterprise program. Start the Apple track only after the owner has
> (a) an Apple Developer Program membership and (b) a confirmed contributor
> copyright position via a CLA or equivalent §7 consent.

### 4.2 Why this strategy and not the others

**Why the §7 exception is the right instrument.**

- *Fact.* It is the mechanism the licence itself provides for exactly this
  situation: additional permissions that "supplement the terms of this License
  by making exceptions from one or more of its conditions" [S9][S10].
- *Fact.* It is in active use for precisely this purpose by other free-software
  projects: Haven ships an "App store distribution exception" as an AGPL-3.0
  §7 additional permission [S13]; Litter ships an equivalent AGPL-3.0 §7
  permission for Apple App Store and Google Play [S14].
- *Fact.* It preserves the project's identity. The work stays AGPL-3.0-or-later;
  only the conflict with one distribution channel's terms is removed.
- *Interpretation.* It is revocable per copy and per contributor: §7 states that
  when conveying a copy, *"you may at your option remove any additional
  permissions from that copy, or from any part of it"* [S9]. A contributor who
  disagrees can withdraw the permission for their own contribution — which is
  the correct, proportionate outcome rather than a licence change for
  everybody.

**Why App Store rather than the EU alternative channels.**

- *Fact.* The App Store is the only channel with worldwide reach; the EU
  channels are EU-only and, as of 2026-10-25, gated behind eligibility criteria
  that an individual project is unlikely to meet [S28][S29].
- *Fact.* The project wants visibility and is the fourth of five platform
  tracks [R6]; the web app already provides reach without any of this [R4].

**Why not relicense the core permissively.**

- It contradicts the project's stated licence and identity [R1][R2].
- It requires consent from every copyright holder; the repository currently has
  **two** contributors in its history (`mazer666` ×2, `Mavis` ×1, measured
  2026-10-25) [R5] — tractable today, but a permanent loss of the copyleft
  guarantee that is the project's main asset.
- The problem being solved is a *distribution-channel* problem, and a
  distribution-channel problem deserves a distribution-channel exception.

**Why not dual-license (AGPL-3.0-or-later OR a proprietary/App-Store licence).**

- It achieves the same legal outcome with strictly more paperwork, and it
  introduces the possibility of a proprietary downstream fork that the §7
  exception does not [S15].
- It requires the project to hold all copyright outright, which today it does
  not: there is no CLA or DCO in `CONTRIBUTING.md` (verified: the file contains
  exactly one licence mention and no CLA/DCO/sign-off language) [R2].

**Why not LGPL for the core.**

- *Fact.* The LGPL's linking exception requires that the user be able to
  replace the library; on a locked-down platform they cannot, and LWN's
  discussion of the VLC relicensing concluded that LGPL does not avoid the
  problem on such a platform [S16].
- *Fact.* VLC had to relicense the library itself and then the application to
  the MPL to return to the store [S7]. Copying that pattern means giving up
  copyleft for the whole project.

**Why not the Enterprise program.**

- *Fact.* It requires 100+ employees, a legal entity, proprietary in-house apps
  for internal use, and a verification interview [S24]. Phomu is a public
  open-source project; using enterprise certificates to distribute it to the
  public would breach the program's terms.

### 4.3 What the alternatives would cost

| Alternative | Legal result | Reach | Cost | Why not chosen |
|---|---|---|---|---|
| **A. App Store under the §7 exception (recommended)** | Compliant, provided every copyright holder consents | Global | 99 USD/yr + native app + review + CLA | — |
| **B. No App Store: ad-hoc + sideloading only** | Compliant without any exception | 100 devices/product family/yr [S23]; 3 devices with 7-day expiry via free account [S22] | Low cash cost, high manual effort | No visibility; contradicts the goal of the track |
| **C. App Store without an exception** | **Not compliant** [S1][S2][S4] | Global | — | Relies on nobody enforcing the GPL; the VLC precedent shows enforcement is real [S3][S7] |
| **D. Relicense the core permissively** (`MIT/Apache-2.0`) | Compliant | Global | Contributor consent required | Abandons the project's licence identity |
| **E. Dual licence (AGPL-3.0-or-later OR commercial)** | Compliant | Global | Contributor consent + a second licence to maintain | Same outcome as A with more machinery |
| **F. Apple channel under a commercial licence, other channels GPL** | Compliant | Global | Full contributor consent | Same as D/E, with the added asymmetry of two licence regimes |
| **G. LGPL core + GPL app** | Contested; LGPL's linking exception does not survive a locked-down platform [S16] | Global | Contributor consent | Does not actually solve the problem |
| **H. Enterprise program** | Program terms prohibit the use case [S24] | n/a | 299 USD/yr + ineligible | Ineligible |
| **I. Drop the Apple track entirely** | Compliant | None | Saves all the work | Forfeits the audience and the Rust reuse for iOS |

---

## 5. The operational plan

Ordered. Each stage states its entry condition, so the plan degrades safely
if a stage cannot start.

### Stage A — Decisions and paperwork (no Apple account required)

| # | Action | Owner | Done when |
|---|---|---|---|
| A1 | Ratify or reject the strategy in this document | Owner | ADR-0007 moves from `proposed` to `accepted` |
| A2 | Add the licence files: `LICENSES/APP-STORE-EXCEPTION.md`, `NOTICE` (see [§7](#7-licence-structure-in-the-repository)) | Owner + Docs | Files present, referenced from `README.md` and `LICENSE` |
| A3 | Choose a contributor agreement and add it to `CONTRIBUTING.md` — **CLA recommended**, DCO acceptable | Owner | `CONTRIBUTING.md` states the inbound licence *and* §7 consent |
| A4 | Obtain retroactive §7 consent (or copyright assignment) from existing contributors | Owner | Signed consent from the contributors measured in [R5] |
| A5 | Define the Rust core crate boundary and its dependency rules (see [§6](#6-the-rust-specific-part)) | Chief Architect | The boundary is written into `ARCHITECTURE.md` — **note: `ARCHITECTURE.md` is owned by another worker; see [§13](#13-items-outside-this-workers-scope)** |
| A6 | Decide the Rust crate's licence metadata (`license = "AGPL-3.0-or-later"` plus a pointer to the exception) | Chief Architect | `Cargo.toml` and the crate README agree |

**Entry condition for Stage B:** A1 accepted **and** A4 at least started.
The §7 exception must exist in writing **before** anything is uploaded to
TestFlight, because TestFlight is Apple-distributed and subject to the same
Usage Rules [S25].

### Stage B — Apple account and App Store Connect (owner)

| # | Action | Detail |
|---|---|---|
| B1 | Enrol in the Apple Developer Program | 99 USD per membership year for an individual or an organisation [S19][S20]. Individuals enrol with their legal name; an alias or business name in the Apple Account name fields delays approval [S20]. Fee waiver available for eligible non-profits, accredited educational institutions and government entities [S19]. Enterprise Program: 299 USD/yr — **not applicable** [S21][S24] |
| B2 | Choose the Bundle ID | Reverse-DNS of the owner, e.g. `de.<owner>.phomu`. Must be unique across the platform; register it before the App Store record is created |
| B3 | Create the App Store Connect record | Name, subtitle, description, category, support URL, marketing URL, copyright line, **privacy policy URL** (reuse `PRIVACY.md` rendered as a web page [R4]), **age rating** (the current questionnaire is per-region; Phomu's content is song metadata and user-supplied party play — expect 4+ but confirm against Apple's current questionnaire at submission time) |
| B4 | Provide a **Custom EULA** | This is the mechanism that surfaces the GPL terms and the source offer to every user [S12][S11]. Must be consistent with Apple's minimum terms and with applicable law [S12] |
| B5 | Complete the App Privacy questionnaire | Phomu's web app collects no data and does no tracking [R4]. The native app should mirror that: **no data collected, no tracking**, with the privacy manifest declared accordingly (B6) |
| B6 | Create `PrivacyInfo.xcprivacy` and place it at the **root of the app bundle** | **Fact:** since 2024-05-01 apps that do not describe their use of required-reason APIs cannot pass App Store Connect review; since 2025-02-12 apps must contain a valid privacy manifest for certain commonly used third-party SDKs [S35][S36]. **Fact:** the manifest is a property list named `PrivacyInfo.xcprivacy` recording collected data types and required-reason API usage [S35]. *To be verified at implementation time:* the exact list of required-reason categories the Phomu app triggers — at minimum, file timestamp APIs (the game state and the catalogue are files) and, on the Swift side, `UserDefaults` |
| B7 | Certificates and provisioning profiles | Prefer automatic signing. Distribution certificates are required for App Store/TestFlight builds |
| B8 | Export compliance | Complete the export-compliance prompt at upload. *To be verified:* the correct answer for an app that only uses OS-provided TLS — mark this as **to be verified** rather than asserting an answer |
| B9 | TestFlight setup | Beta app description ("What to test"), feedback email, internal group, then an external group. The first build of each version goes through Beta App Review; later builds of the same version usually do not [S25][S27] |

### Stage C — Technical build

See [§6](#6-the-rust-specific-part) for the Rust constraints. Platform-level
requirements that apply to the whole app:

- **Fact.** Uploads must be built with Xcode 26+ and the iOS 26 / iPadOS 26 SDK
  or later since 2026-04-28; iOS/iPadOS apps must target **iOS 13 or later**
  [S34].
- **Fact.** Guideline 2.5.1: public APIs only, must run on the currently
  shipping OS. Guideline 2.5.2: the app must be self-contained in its bundle
  and *"may not download, install, or execute code which introduces or changes
  features or functionality of the app"* [S32]. This is the rule that shapes
  the Rust core's dependency list.
- **Fact.** Guideline 2.5.5 requires apps to be fully functional on IPv6-only
  networks; 2.5.6 requires web browsing to use WebKit [S32][S32 mirror].
- **Fact.** Guideline 5.2.2 requires that the use of third-party services be
  specifically permitted under their terms of use, with authorisation provided
  on request; 5.2.3 addresses saving, converting or downloading media from
  third-party sources and notes that streaming may violate terms of use
  [S32]. Phomu streams from official YouTube/Spotify/Apple Music/Amazon Music
  embeds [R4] — the App Review Notes must document exactly which official
  embed players are used and on what basis.

### Stage D — App Review preparation

| Guideline | Risk for Phomu | Mitigation |
|---|---|---|
| **4.2 Minimum Functionality** — *"Your app should include features, content, and UI that elevate it beyond a repackaged website"*, and apps must provide *"some sort of lasting entertainment value or adequate utility"* [S32] | **High.** Phomu has an existing web app. A thin native wrapper around it risks rejection | The native app must add genuinely native value: camera-based QR scanning, haptics, local notifications, native share sheet, offline catalog on device, AirPlay/Now Playing integration, accessibility. Prepare a reviewer walkthrough and a short demo video |
| **4.2.3(ii)** — if the app must download resources on first launch, it must disclose the download size and prompt the user [S32] | Medium. The current static export is **147 MB**, of which **142 MB** are cover images [R3] | Ship the catalogue metadata in the bundle; fetch covers on demand with an explicit size disclosure and a user prompt. *To be verified:* the current per-bundle size limit in Apple's App Store Connect documentation |
| **2.5.2** — no downloading/installing/executing code [S32] | Medium for a Rust core that might want a runtime download | The Rust core is compiled into the app; no runtime code download, ever |
| **5.2.1** — apps must be submitted by the party that owns or has licensed the relevant IP rights [S32] | Medium: covers and song metadata are third-party material [R4][R2] | Document the licensing basis of the cover images and the embeds; keep the existing attribution notices |
| **5.2.2 / 5.2.3** — third-party services and media streaming [S32] | Medium | Use official embed players only; document authorisation in App Review Notes |
| **4.8 Login Services** [S32] | Low | Phomu has no user accounts [R4] — not applicable |
| **4.7** | Low | 4.7 governs software not embedded in the binary [S32][S33]. Phomu embeds everything and downloads no executable code, so 4.7 is out of scope — **provided** the app does not ship a mini-app/chatbot/emulator layer |

### Stage E — After launch

- Upload dSYMs for crash symbolication. *To be verified:* the current App Store
  Connect dSYM upload requirement and retention rules (App Store Connect Help,
  "Uploading dSYMs").
- Monitor for the App Store's SDK floor moving again [S34]; keep the Rust
  toolchain and Xcode in step.
- Watch the licence position: if a contributor withdraws §7 consent, revisit
  whether their part can remain in the App Store build.

---

## 6. The Rust-specific part

This section states the **constraints the shared Rust core must satisfy**. It
deliberately does not design the crate — that belongs to the architecture
worker (see [§13](#13-items-outside-this-workers-scope)).

### 6.1 Toolchain and targets

**Fact.** `aarch64-apple-ios` (device) and `aarch64-apple-ios-sim`
(Apple-silicon simulator) are **Tier 2 targets** with the **full standard
library available** (`std` marked ✓) [S37][S38]. Building the ARM64 targets
requires **Xcode 12 or later**; the minimum supported version is iOS 10.0 and
can be raised per binary via the deployment target; `rustc` honours
`IPHONEOS_DEPLOYMENT_TARGET` [S37].

**Fact.** `cdylib` output became available for Apple iOS and tvOS in Rust
1.46.0 (2020-08-27) [S40].

**Operational rules derived from the above:**

1. The deployment target used by `cargo` must **equal** the Xcode target's
   minimum. Set `IPHONEOS_DEPLOYMENT_TARGET` once and export it for every
   `cargo` invocation and for the Xcode target.
2. Apple's floor is the iOS 26 SDK / Xcode 26 since 2026-04-28 [S34]; Apple's
   minimum supported deployment target is iOS 13 [S34]. Choose one value and
   use it everywhere.
3. One Rust `staticlib` per app. Multiple UniFFI-generated libraries linked
   into the same iOS app are known to produce duplicate-symbol and Swift
   module conflicts [S43]. Put **all** Rust crates the app needs behind a
   single FFI crate.
4. Package the device and simulator slices as an **XCFramework** with a
   `module.modulemap`, following Mozilla's shipped pattern for Rust components
   in Swift packages [S44].

### 6.2 The UniFFI bridge

**Fact.** UniFFI is Mozilla's toolkit for building cross-platform software
components in Rust and generating bindings for other languages; it is used
extensively in Firefox for iOS, with bindings for both Kotlin and Swift, and
the Swift bindings are generated by `uniffi-bindgen` [S42]. Mozilla's Xcode
integration guide documents building the Rust crate into a static library,
running `uniffi-bindgen` to generate Swift sources plus a bridging header, and
ships a working iOS example app [S41].

**Operational rules:**

1. Generate the Swift bindings from the same lockfile and profile as the
   binary; never regenerate them by hand.
2. `module.modulemap` must be named exactly `module.modulemap` and live inside
   the headers directory, or Xcode will not find the module [S41].
3. Do **not** link more than one UniFFI library into the app [S43].

### 6.3 What the shared core must not do

**Fact.** Apple's own platform-support documentation for Apple's tvOS/watchOS
targets records that `std::process::Command`'s API returns an error if it is
configured in a manner that cannot be performed with `posix_spawn`, because the
`fork`/`exec` approach is prohibited on those platforms — and adds that
`posix_spawn` *"still probably will get you rejected from app stores, so is
likely sideloading-only"* [S39]. On iOS the same prohibition is reflected in
App Review Guideline 2.5.2: an app may not *"download, install, or execute
code which introduces or changes features or functionality of the app"* [S32].

**Interpretation.** Process spawning and runtime code loading are therefore
architecturally forbidden in the shared core, not merely discouraged.

**Hard rules for the shared Rust core:**

| Rule | Reason | Verification |
|---|---|---|
| No `std::process`, no `tokio::process`, no `command`/`fork`/`exec` crates | Prohibited on Apple platforms [S39]; guideline 2.5.2 [S32] | `cargo tree` shows no process-spawning dependency |
| No runtime code download, no dynamic loading of non-system libraries | Guideline 2.5.2 [S32]; App Store binary integrity | `cargo tree` + `otool -L` on the built static library |
| No `cdylib`/`.dylib` delivery into the app bundle | iOS app bundles ship code, not loadable plug-ins | Build artefact inspection |
| Public APIs only, no non-public Apple API surface | Guideline 2.5.1 [S32] | Code review + link-map inspection |
| Full IPv6-only functionality | Guideline 2.5.5 [S32] | Network tests over an IPv6-only network |
| Compiles for `aarch64-apple-ios` with `cargo build --target aarch64-apple-ios` | The core must be portable to the Apple target without forks | CI job on a macOS runner |

**Candidate crates to exclude from the shared core — to be verified by a
compile probe, not asserted here.** The following are *candidates* because
their usual Apple behaviour is either a known platform limitation or a
conventional non-Apple dependency. Each must be confirmed with
`cargo build --target aarch64-apple-ios` before the crate boundary is frozen:

- Any crate whose networking layer relies on `epoll`/`io_uring` semantics
  rather than `kqueue` (the `mio`/`tokio` reactor surface).
- Any crate that spawns subprocesses (`tokio::process`, `std::process`).
- Any crate linking a bundled OpenSSL (no OpenSSL on iOS; use a
  `rustls`-based or platform-security-based TLS stack).
- Any crate that reads or writes outside the app container (guideline 2.5.2
  "may not read or write data outside the designated container area" [S32]).

*Explicit note:* the brief for this document listed "`mio`, Tokio" as crates
that do not work on iOS. The primary sources consulted here establish the
**process-spawning** limitation [S39] and the **self-containment** rule [S32];
they do **not** establish that `mio` or `tokio` as a whole fail to build for
`aarch64-apple-ios`. That specific claim is therefore **to be verified** by a
compile probe, and is not relied upon in this document.

### 6.4 Build artefacts

- **One** Rust `staticlib` → `XCFramework` → Swift module [S41][S44].
- **Debug symbols:** Apple requires dSYMs for crash symbolication in the App
  Store. *To be verified:* the current upload path and retention rules in App
  Connect Help ("Uploading dSYMs"). Rust panics must therefore not be stripped
  out of the release profile — plan a release profile that keeps symbols.
- **Bitcode:** no longer part of Apple's submission pipeline (Bitcode was
  removed from Xcode in the Xcode 14 generation). *To be verified* against
  current Xcode documentation before the first submission; do not rely on this
  document for it.

---

## 7. Licence structure in the repository

**Recommendation.** Phomu stays **AGPL-3.0-or-later** for the whole work. The
only licence change is one **additional permission** granted under §7,
published as a separate file, plus a `NOTICE`.

Proposed layout:

```text
LICENSE                              # the AGPL-3.0 full text (changed on 2026-10-25
                                     # from GPL-3.0 to AGPL-3.0-or-later)
NOTICE                               # new: copyright holders, third-party components,
                                     #       pointer to the App Store Exception
LICENSES/
  APP-STORE-EXCEPTION.md             # new: the AGPL-3.0 §7 additional permission
  AGPL-3.0-or-later.txt               # optional: verbatim licence text as shipped
```

### 7.0 What the AGPL adds over the GPL: §13 Remote Network Interaction

**Fact.** AGPL-3.0 §13 requires that, if the program is used over a network,
the users interacting with it are offered the **complete corresponding source**
of the running version [S9][S45]. The GPL has no equivalent rule.

**Why this matters for Phomu.** The licence change from GPL-3.0-or-later to
AGPL-3.0-or-later was decided by the owner on 2026-10-25. It does not change
the App Store analysis — §7 exists in the AGPL exactly as in the GPL, and the
Haven precedent is an AGPL §7 grant as well [S13]. What it changes is the
**network** obligation.

**Interpretation.** Phomu's web application is a **static client**: the
repository at `https://github.com/mazer666/Phomu` holds the whole application,
there is no server-side component that runs a modified version of the program,
and the deployed artefact is a static export. §13 is therefore satisfied in the
simplest possible way — the source of the deployed version is the source in the
repository, and the application links to it.

**What still has to be true.** If a future version introduces a server that
runs Phomu code — a session service, a synchronisation endpoint, a hosted
catalogue — that server becomes the "modified version" of the program and §13
applies to it in full: the source of the running server must be offered to
every user who interacts with it.

**Recommendation.** The web shell keeps a **visible source link** (in the
legal pages and in the navigation). The native shells are unaffected: they
distribute the source with the binary, which is what §13 also asks for.

### 7.1 What `LICENSES/APP-STORE-EXCEPTION.md` must contain

AGPL-3.0 §7 requires that the additional terms be either stated *"in the form of
a separately written license, or stated as exceptions"* and that *"you must
place, in the relevant source files, a statement of the additional terms that
apply to those files, or a notice indicating where to find the applicable
terms"* [S9].

Minimum content:

1. **The grant.** *"Additional permission under GNU Affero General Public License
   version 3 section 7: The
   copyright holders grant permission to convey the covered work through
   application distribution services operated by third parties — including but
   not limited to the Apple App Store, Google Play and alternative app
   marketplaces — notwithstanding any terms of service, usage rules or digital
   distribution requirements of such services that might otherwise be read as
   further restrictions under this License, provided that the complete
   corresponding source of the conveyed work remains available to its users as
   this License requires."*
2. **The scope limit.** The permission removes **only** the distribution-channel
   conflict. It does not touch the source-availability obligation, the
   licence-notice obligation, or the prohibition on further restrictions
   imposed by Phomu itself.
3. **The revocation clause.** *"Removing this exception from a covered work is
   permitted by section 7 of the License, but the work as distributed from this
   repository carries it."* (Modelled on the Haven precedent [S13].)
4. **The copyright holders.** Named, with the date of the grant, so that a
   later reader can see exactly who consented.
5. **The pointer.** §7 requires a statement in the source files or a notice
   indicating where the applicable terms are found. Recommended: a header
   comment in the Rust core crate (`crates/<core>/src/lib.rs`) and a `license`
   field plus a pointer in the crate's `Cargo.toml`.

### 7.2 What `NOTICE` must contain

- The copyright line(s) and the years.
- A statement that the work is licensed AGPL-3.0-or-later and that the App
  Store Exception is an additional permission, not a change of licence.
- A pointer to the complete corresponding source (the Git repository is the
  canonical source, with a release tag per shipped version).
- The third-party component inventory (Rust crates and their licences, the
  YouTube/Spotify/Apple Music/Amazon Music embeds) — this also serves App
  Review Guideline 5.2.1 [S32].

### 7.3 What this means for contributors

**Fact.** A §7 additional permission can only be granted by the copyright
holders [S9][S10]. A contributor who has not consented cannot be bound by it,
and the project's right to grant it does not cover their contribution.

**Fact.** §7 gives the *recipient* of a copy the right to remove the additional
permission from that copy [S9]. Consent is therefore per-contributor and
revocable without litigation.

**Recommendation — the contributor agreement.** Add a CLA (recommended) or a
DCO (acceptable) to `CONTRIBUTING.md` that does two things:

1. Licences the contribution under AGPL-3.0-or-later.
2. **Expressly consents to the §7 additional permission** (or assigns the
   copyright to the project, which lets the project grant it).

**Interpretation.** A CLA is the stronger instrument here: copyright
assignment gives the project the standing to grant the §7 permission (and any
future exception) without re-canvassing contributors, and to dual-license if
the owner ever chooses to. The cost of a CLA is contributor friction; the
cost of no agreement is that Phomu cannot lawfully offer the App Store build
without chasing individual consent. The current contributor base is small
(two contributors in the repository history [R5]), so the cost of retroactive
consent is low **now** and grows with every new contributor.

**Note.** `CONTRIBUTING.md` currently contains a single licence mention and no
CLA/DCO/sign-off language [R2]. This document describes the required change;
it does not make it. `CONTRIBUTING.md` is not part of this worker's scope
(see [§13](#13-items-outside-this-workers-scope)).

---

## 8. What happens if the owner never acquires an Apple account

The plan must be viable without an account, and it is:

| Activity | Possible without a paid account? | Notes |
|---|---|---|
| The web app keeps shipping | **Yes** | Unchanged; it is a static export on GitHub Pages [R6] |
| Android, Google TV/Fire TV, macOS/Linux and Windows tracks | **Yes** | Unaffected by anything in this document |
| Building the shared Rust core for iOS | **Yes** | Requires a Mac with Xcode, but **no** membership. `rustup target add aarch64-apple-ios aarch64-apple-ios-sim` and a local `cargo build --target aarch64-apple-ios` work without an Apple account [S37] |
| Generating the UniFFI Swift bindings | **Yes** | `uniffi-bindgen` is a local tool [S41] |
| Running the native app on the developer's own device | **Yes, for 7 days at a time** | A free Apple Account allows **3 device registrations** and **up to 3 apps per device**, with App IDs, device registrations and provisioning profiles all **expiring after 7 days** [S22] |
| Distributing to anyone else | **No** | No TestFlight, no App Store, no ad-hoc without a paid membership [S22][S23] |
| EU alternative distribution / Web Distribution | **No** | Requires the paid membership plus Apple's authorisation criteria [S28] |

**Recommendation.** If the account does not materialise, the Apple track
**degrades to "designed, not shipped"** while the shared Rust core — which
benefits all five tracks — still gets built. The four other tracks and the web
app continue unaffected. The decision that must **not** be deferred is A3/A4
(the contributor agreement and retroactive §7 consent): that work is valid
regardless of whether an Apple account ever exists, and delaying it makes the
consent problem harder to solve with every new contributor.

---

## 9. Open decisions for the owner

| # | Decision | Recommendation | Why |
|---|---|---|---|
| **D1** | Adopt the AGPL-3.0 §7 App Store Exception as Phomu's Apple-channel instrument? | **Yes** | Keeps AGPL-3.0-or-later; removes exactly one conflict; matches an established pattern [S13][S14]. Alternative: never ship on the App Store, which forfeits the track's entire purpose |
| **D2** | CLA or DCO for contributions? | **CLA** (Apache-2.0-style, individual) | Only a CLA (or assignment) gives the project standing to grant §7 permissions and to relicence later. A DCO records intent but leaves copyright with each contributor |
| **D3** | Individual or organisation enrolment? | **Individual now** | Fastest path, no D-U-N-S number, legal name as the seller [S20]. Convert to an organisation later if a legal entity is formed. Organisation enrolment requires a D-U-N-S number and Apple verification [S20] |
| **D4** | Should a non-profit / educational entity be formed? | **Evaluate later; not a blocker** | It is the one realistic route to Apple's fee waiver [S19] and to the "government entity, educational institution, or non-profit" authorisation criterion for EU Web Distribution [S28]. It is a registry decision with real obligations — not a licensing question |
| **D5** | Bundle ID and App Store name | `de.<owner>.phomu`; check name availability in the App Store at enrolment time | The name is a scarce, permanent resource; the Bundle ID is permanent once used |
| **D6** | Minimum deployment target | **iOS 16** unless a specific native feature requires newer | Apple's floor is iOS 13 [S34]; iOS 16 is a practical compromise between reach and SwiftUI capability. *To be confirmed against the UI work* |
| **D7** | Where does the game content live in the native app? | **Catalogue metadata in the bundle, covers on demand with an explicit size prompt** | The current export is 147 MB with 142 MB of covers [R3]; guideline 4.2.3(ii) requires disclosing and prompting for downloaded resources [S32]; the per-bundle size limit must be verified against current Apple documentation |
| **D8** | Does Phomu want App Store review at all, given the enforcement risk? | **Yes, with the exception in place** | The residual risk is a single contributor objecting [S3][S7]. Mitigation: a CLA (§D2) and per-contributor revocation handling (§7.3). If the owner judges the residual risk unacceptable, fall back to alternative D: sideloading only, and the track loses its reach |

---

## 10. Known limitations of this document

1. **It is not legal advice.** Every legal statement here restates a public
   source and marks its interpretation. A qualified lawyer must review the
   final §7 exception text before Phomu publishes or relies on it.
2. **The residual §7/DRM dispute is unresolved.** Whether a §7 permission alone
   reconciles App Store distribution with the GPL is not settled in any public
   source consulted here [S2][S7][S11][S13]. The mitigation is the model's
   existence in the wild, not a court ruling.
3. **The 2012 "Does Apple violate the GPL?" reference could not be verified**
   at a primary source. See [§2.3](#23-the-historical-record).
4. **Apple's EU business terms changed on 2026-10-01** [S28], three weeks
   before this document was written. The eligibility criteria and the 5% Core
   Technology Commission must be re-read at the time of use; Apple's page is
   the authority.
5. **Numbers marked "to be verified"** are genuinely unverified: the dSYM
   upload requirement and retention rules, the export-compliance answer, the
   Bitcode status, the current App Store bundle size limit, the age-rating
   questionnaire outcome, and the `mio`/`tokio` build behaviour on
   `aarch64-apple-ios`.
6. **Guideline 4.2 is a judgement call, not a rule.** Whether Phomu's native
   app "elevates beyond a repackaged website" is decided case by case by
   App Review [S32]. The mitigation in [§5 Stage D](#stage-d--app-review-preparation)
   is a strong native feature set, not a guarantee.
7. **This document does not describe the Rust crate's internal architecture.**
   It states the constraints only; see [§13](#13-items-outside-this-workers-scope).

### 10.2 Language note

`docs/DOCUMENTATION_POLICY.md` §3 sets German for project documentation and
for ADRs [R7]. This document and ADR-0007 are written in **English** because
the assignment for this deliverable explicitly required English. This is a
deliberate, recorded deviation and needs an owner decision: either these two
documents are translated to German, or `docs/DOCUMENTATION_POLICY.md` §3 is
amended to permit English for licensing documents (which are quoted verbatim
from English-language legal sources and are therefore harder to keep
authoritative in translation).

---

## 11. Sources

All external sources retrieved **2026-10-25** unless otherwise stated.

### 11.1 GPL, the App Store, and licence compatibility

| ID | Source | Used for |
|---|---|---|
| S1 | FSF, *GPL Enforcement in Apple's App Store*, 2010-05-25 — <https://www.fsf.org/news/2010-05-app-store-compliance/> | FSF's 2010 GNU Go case; Apple's ToS as a GPLv2 §6 violation; Apple's removal of GNU Go |
| S2 | FSF, *More about the App Store GPL Enforcement*, 2010-05-26 — <https://www.fsf.org/blogs/licensing/more-about-the-app-store-gpl-enforcement> | Usage Rules as "further restrictions"; DRM "legally instead of technologically"; §10 analysis |
| S3 | FSF, *VLC developer takes a stand against DRM enforcement in Apple's App Store*, 2010-10-29 — <https://www.fsf.org/blogs/licensing/vlc-enforcement> | VLC complaint; DRM and usage rules; the takedown mechanism |
| S4 | ZDNet, *Android vs. iPhone: The GPL Question*, 2011 — <https://www.zdnet.com/article/android-vs-iphone-the-gpl-question/> | Moglen ("Yes"), Smith (§10), Blasi (further restrictions) |
| S5 | LWN, *FSF takes on Apple's App Store over GPL* — <https://lwn.net/Articles/391635/> | Clause-by-clause analysis of the ToS against the GPL |
| S6 | Wikipedia, *GPL compatibility* — <https://en.wikipedia.org/wiki/GPL_compatibility> | The "legal barrier to application stores" framing; Apple's DRM requirement as the specific cause |
| S7 | Wikipedia, *Software relicensing* (VLC) — <https://en.wikipedia.org/wiki/Software_relicensing> | VLC: GPLv2 → LGPLv2 (Oct 2011) → MPL app (Jul 2013) |
| S8 | Wikipedia, *App Store (Apple)* — <https://en.wikipedia.org/wiki/App_Store_(Apple)> | Mac App Store regulations; Apple's removal of GPL-only software |
| S9 | GNU, *GNU Affero General Public License v3* — <https://www.gnu.org/licenses/gpl-3.0.en.html> | §7 Additional Terms (verbatim); the "further restrictions" definition; the §7 revocation right; the notice requirement |
| S10 | GNU, *Frequently Asked Questions about the GNU Licenses* — <https://www.gnu.org/licenses/gpl-faq.en.html> | The §7 additional-permission mechanism; "notwithstanding any other provision" |
| S11 | Apple, *Apple Media Services Terms and Conditions* (Standard EULA) — <https://www.apple.com/legal/internet-services/itunes/us/terms.html> | The EULA's no-modification clause **and its open-source carve-out** |
| S12 | Apple, *Schedule 2 and 3* (Developer agreement schedules), §4.2 — <https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English-UK.pdf> | The right to deliver a Custom EULA |
| S13 | Haven, `LICENSE-EXCEPTIONS.md` — <https://github.com/blaineam/Haven/blob/main/LICENSE-EXCEPTIONS.md> | The working §7 "App store distribution exception" pattern |
| S14 | Litter, `LICENSE` — <https://github.com/0xSero/litter/blob/main/LICENSE> | A second working AGPL-3.0 §7 app-store permission |
| S15 | E. Lazer-Walker, *Picking an OSS license for your iOS app*, 2015 — <https://blog.lazerwalker.com/cortado/2015/07/05/open-source-licenses.html> | Dual licensing requires holding the rights; the contributor problem |
| S16 | LWN, *LGPL and app store*, 2012 — <https://lwn.net/Articles/526355/> | Why LGPL's linking exception does not survive a locked-down platform |
| S17 | Corellium, *How To Install Apps* — <https://support.corellium.com/features/apps/testing-ios-apps> | App Store binaries are FairPlay-encrypted and bound to the device/Apple Account |
| S18 | ISEC TU Graz, *iOS Application Security*, 2026-05-08 — <https://www.isec.tugraz.at/wp-content/uploads/2025/08/2026-05-08-iOS-Application-Security.pdf> | FairPlay DRM on the App Store binary's text segment |

### 11.2 Apple programmes, distribution channels, and the DMA

| ID | Source | Used for |
|---|---|---|
| S19 | Apple, *Membership Details* — <https://developer.apple.com/programs/whats-included/> | **99 USD/yr**; 30%/15% commission; fee waiver for eligible non-profits, educational institutions, government entities |
| S20 | Apple, *Become a member* — <https://developer.apple.com/programs/enroll/> | Individual vs organisation enrolment; legal name as seller; 2FA; alias delays approval |
| S21 | Apple, *Program enrollment* (Account Help) — <https://developer.apple.com/help/account/membership/program-enrollment/> | **99 USD** programme vs **299 USD** Enterprise; payment and renewal |
| S22 | Apple, *Compare memberships* — <https://developer.apple.com/support/compare-memberships/> | Free account: **10 App IDs (7 days)**, **3 device registrations (7 days)**, **3 apps per device**, provisioning profiles expiring **7 days** from issuance; no TestFlight/App Store |
| S23 | Apple, *Devices overview* (Account Help) — <https://developer.apple.com/help/account/devices/devices-overview/> | **100 devices per product family per membership year** for Ad Hoc |
| S24 | Apple, *Apple Developer Enterprise Program* — <https://developer.apple.com/programs/enterprise/> | **299 USD/yr**; **100+ employees**; legal entity; proprietary in-house apps for employees; verification interview |
| S25 | Apple, *TestFlight overview* (App Store Connect Help) — <https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/> | **100 internal** / **10,000 external** testers; **90-day** build life; first build of a version reviewed |
| S26 | Apple, *TestFlight* — <https://developer.apple.com/testflight/> | **100** builds shareable; **30** devices per tester |
| S27 | Apple, *Invite external testers* (App Store Connect Help) — <https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/> | Up to **6** builds into Beta App Review per 24 h; tester limit 1–10,000 |
| S28 | Apple, *Default app controls and app distribution in the EU* — <https://developer.apple.com/support/dma-and-apps-in-the-eu/> | ADP agreement updated **2026-08-18**, effective **2026-10-01**; **5% Core Technology Commission**; the seven eligibility criteria; notarisation |
| S29 | European Commission, *Non-Confidential Summary of DMA Compliance Report* — <https://ec.europa.eu/competition/digital_markets_act/cases/202611/DMA_100123_206.pdf> | Web Distribution from **iOS 17.5 / iPadOS 18**; notarisation for alternatively distributed apps |
| S30 | European Commission DMA portal, *App distribution* — <https://digital-markets-act.ec.europa.eu/businesses-portal/app-distribution_en> | Article 6(4) obligation |
| S31 | EUR-Lex, Commission report **2026/247** — <https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52026DC0247> | Preliminary findings: fee disincentive, over-strict eligibility, burdensome user journey |

### 11.3 App Review, toolchain, privacy manifest

| ID | Source | Used for |
|---|---|---|
| S32 | Apple, *App Review Guidelines* — <https://developer.apple.com/app-store/review/guidelines/> | 2.5.1, 2.5.2, 2.5.5, 2.5.6, 4.2, 4.2.3(ii), 4.7, 4.8, 5.2.1, 5.2.2, 5.2.3 |
| S33 | Apple Developer News, *Updated App Review Guidelines now available*, 2017 — <https://developer.apple.com/news/?id=01092017c> | The scope of 4.7 (HTML5/JS mini apps and mini games) |
| S34 | Apple, *Upcoming Requirements* — <https://developer.apple.com/news/upcoming-requirements/> | **Xcode 26 / iOS 26 SDK since 2026-04-28**; **iOS 13** minimum deployment target |
| S35 | Apple, *Privacy manifest files* — <https://developer.apple.com/documentation/bundleresources/privacy-manifest-files> | `PrivacyInfo.xcprivacy`; data types; required-reason APIs; placement in the bundle |
| S36 | Apple, *Adding a privacy manifest to your app or third-party SDK* — <https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk> | **2024-05-01** required-reason API enforcement; **2025-02-12** third-party SDK manifests |

### 11.4 Rust on Apple platforms

| ID | Source | Used for |
|---|---|---|
| S37 | rustc Book, *\*-apple-ios* — <https://doc.rust-lang.org/stable/rustc/platform-support/apple-ios.html> | Tier 2 status; `rustup target add`; **Xcode 12+**; minimum **iOS 10.0**; `IPHONEOS_DEPLOYMENT_TARGET` |
| S38 | rustc Book, *Platform Support* — <https://doc.rust-lang.org/stable/rustc/platform-support.html> | `std` availability (✓) for `aarch64-apple-ios` and `aarch64-apple-ios-sim` |
| S39 | rustc Book, *\*-apple-tvos* — <https://doc.rust-lang.org/nightly/rustc/platform-support/apple-tvos.html> | `std::process::Command` limitations on Apple platforms; `posix_spawn`; the app-store rejection warning |
| S40 | Rust Release Notes — <https://doc.rust-lang.org/nightly/releases.html> | Rust 1.46.0: `cdylib` for iOS/tvOS; Rust 1.64.0: `rust-lld` for iOS |
| S41 | UniFFI user guide, *Integrating with Xcode* — <https://mozilla.github.io/uniffi-rs/latest/swift/xcode.html> | Static-lib build phase; `uniffi-bindgen --language swift`; the iOS example app; `module.modulemap` naming |
| S42 | `mozilla/uniffi-rs` — <https://github.com/mozilla/uniffi-rs> | UniFFI's purpose; Swift/Kotlin bindings; use in Firefox iOS |
| S43 | `mozilla/uniffi-rs` issue #2802 — <https://github.com/mozilla/uniffi-rs/issues/2802> | Duplicate-symbol and Swift module conflicts with multiple UniFFI libraries in one iOS app |
| S44 | Mozilla application-services, *Shipping Rust Components as Swift Packages* — <https://mozilla.github.io/application-services/book/design/swift-package-manager.html> | The XCFramework + `module.modulemap` + UniFFI Swift packaging pattern in production |

---

## 12. Repository evidence

| ID | Artefact | What it shows |
|---|---|---|
| R1 | [`LICENSE`](../../LICENSE) | "This project (Phomu) is licensed under AGPL-3.0-or-later." The file points to the full AGPL-3.0-or-later text rather than embedding it |
| R2 | [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | Line 5: *"Phomu is an open-source party game under **AGPL-3.0-or-later**."* — verified by `grep -c -i "gpl" CONTRIBUTING.md` → **1**. There is **no** CLA, DCO, sign-off or copyright-assignment clause in the file |
| R3 | [`docs/BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §3 | Static export **147 MB**, of which **142 MB** are cover images (1,649 files) |
| R4 | [`PRIVACY.md`](../../PRIVACY.md), [`SECURITY.md`](../../SECURITY.md) | No accounts, no analytics, no tracking, no telemetry; game state in `localStorage`; all network requests go to third-party music providers, not to a Phomu server |
| R5 | `git shortlog -sne --all` (run 2026-10-25) | Two contributors in the repository history: `mazer666` (2 commits), `Mavis` (1 commit) |
| R6 | [`project/project.yaml`](../../project/project.yaml) | `platforms.mobile.native_app: false` — the project is currently web-only; `platforms.deployment.target: "GitHub Pages"` |
| R7 | [`docs/DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md) §3 | Project documentation and ADRs are German — the language conflict noted in [§10.2](#102-language-note) |

---

## 13. Items outside this worker's scope

These files belong to other workers and were **not** modified. Each entry is a
required follow-up that this document specifies but does not implement.

| File | What would need to change | Owner |
|---|---|---|
| `LICENSE` | Optionally point to `LICENSES/APP-STORE-EXCEPTION.md` as an additional permission | Owner / Docs |
| `CONTRIBUTING.md` | Add the CLA or DCO, including explicit §7 consent; state the inbound licence | Owner / Docs |
| `README.md` | Add a "Licence" section pointing at `docs/licensing/` and the exception | Docs |
| `docs/README.md` | Add `licensing/` to the documentation tree and the "What is where" table | Docs |
| `ARCHITECTURE.md` | Define the Rust core crate boundary and its dependency rules ([§6.3](#63-what-the-shared-core-must-not-do)) | Chief Architect |
| `project/project.yaml` | Add the `ios`/`ipados` platform entry and the licensing decision reference | Chief Architect / PM |
| `REQUIREMENTS.md`, `ROADMAP.md`, `docs/design/**` | Apple-track requirements and roadmap entries | Product Manager / Architect |
| `SECURITY.md`, `PRIVACY.md` | The native app's privacy manifest and data-flow statements must be added when the app exists | Security & Privacy Manager |
