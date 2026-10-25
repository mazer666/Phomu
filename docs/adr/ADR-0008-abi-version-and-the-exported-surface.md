# ADR-0008 — The ABI version and the exported surface of the bridges

**Status:** accepted
**Date:** 2026-10-25
**Owner role:** Chief Architect
**Related requirement IDs:** BRIDGE-101, BRIDGE-102, BRIDGE-103, BRIDGE-104, BRIDGE-111, BRIDGE-114, CORE-111

> **Language note.** The whole repository is English — the documentation, the
> code comments and the test names. ADR-0001 to ADR-0004 were translated
> along with the rest on 2026-10-25, so there is no language exception left.
> The decision is recorded in
> [`../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md),
> open decision **O-10**, and is enforced by
> `scripts/check-doc-language.mjs`.

---

## Context

### The measured starting point

The bridges of Phomu were built in the milestone **P0 — Platform foundation**.
The facts below were measured on branch `main` on 2026-10-25.

| Fact | Value | Measurement |
|---|---|---|
| The version of the exported surface | `1.0.0` | `core/phomu-core/src/abi.rs:15-27` |
| The functions the UniFFI bridge exports | 17 | `platform/phomu-ffi/src/surface.rs` (`EXPORTED_FUNCTIONS`) |
| The types the UniFFI bridge exports | 18 | `platform/phomu-ffi/src/surface.rs` (`EXPORTED_TYPES`) |
| The generated Kotlin bindings | 4 720 lines | `wc -l platform/phomu-ffi/bindings/kotlin/org/phomu/bridge/phomu_ffi.kt` |
| The generated Swift bindings | 4 710 lines | `wc -l platform/phomu-ffi/bindings/swift/PhomuBridge.swift` |
| The failures the bridge carries | 29 | `core/phomu-errors/src/lib.rs` (`ErrorCode::ALL`) |

### The force

The base and the shells are released independently. A shell that runs against
a base it was not written for must fail **closed** — at start-up, not in the
middle of a round
([`../design/BUILD-CONTRACT.md`](../design/BUILD-CONTRACT.md) § 3.2).

The version alone is not enough for that. The version says *which* version of
the surface is exported; it does not say *which* surface that is. Two
situations are possible and both are dangerous:

1. A symbol is added to the bridge, the version is not raised, and an old
   shell loads a library it does not know. The call fails at run time — on a
   phone, in a party.
2. The version is raised, but nothing says *why*. The history of the version
   is lost, and the bracket of a shell cannot be reviewed.

The build contract already names the mechanism for the second point: the
version triple and the change matrix
([`../design/BUILD-CONTRACT.md`](../design/BUILD-CONTRACT.md) § 3.1 and § 3.3).
It does not name the mechanism for the first point.

---

## Decision

### 1. The version lives in the base and is re-exported by the bridges

The single definition is `core/phomu-core/src/abi.rs`
(`ABI_VERSION_MAJOR`, `ABI_VERSION_MINOR`, `ABI_VERSION_PATCH`). The bridges
re-export it (`platform/phomu-ffi/src/abi.rs`); they do not declare a version
of their own.

### 2. The exported surface has a fingerprint

The bridge declares the symbols it exports in
`platform/phomu-ffi/src/surface.rs` (`EXPORTED_FUNCTIONS`,
`EXPORTED_TYPES`). A fingerprint (FNV-1a, 64 bit) is computed over both
lists.

### 3. The rule: a change of the surface raises the version

> **A change of the exported symbols raises the ABI version of the base.**
> The fingerprint test is the enforcement: the test compares the fingerprint
> with a committed expectation, and the expectation is changed **together
> with** the version.

The test is `the_surface_fingerprint_is_stable` in
`platform/phomu-ffi/tests/roundtrip.rs`. The fingerprint of the surface of
version 1.0.0 is `0x2e486765000e97b0`.

The change matrix of the build contract applies unchanged: a removed or
renamed export is a **major**, an added export or an optional field is a
**minor**, an internal change is a **patch**.

### 4. The version travels into every binding

* the UniFFI bindings carry it in `phomu_abi_version()` and
  `phomu_abi_versions()`;
* the generated C header carries it in `PHOMU_ABI_VERSION_MAJOR`,
  `PHOMU_ABI_VERSION_MINOR` and `PHOMU_ABI_VERSION_PATCH`; the header is
  **generated** by `cargo run -p phomu-capi --bin phomu-capi-header` and never
  written by hand;
* the WebAssembly module carries it in `phomu_abi_version()`.

### 5. The gate checks the agreement

`scripts/check-crate-boundaries.mjs` compares the version of the Rust source
of the base with the version of the generated C header. A stale header is a
**build failure**, not a runtime surprise (rule G5 of
[`../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
§ 3.6).

### 6. The C-ABI bridge reuses the wire model of the UniFFI bridge

`platform/phomu-capi` depends on `platform/phomu-ffi` and reuses its wire
model, its registry and its error mapping. The rule table of the gate names
the edge as an exception
(`scripts/crate-boundaries.rules.json`).

**WHY:** the two bridges export the same surface
([`../design/BUILD-CONTRACT.md`](../design/BUILD-CONTRACT.md) § 2.1). Two
copies of the wire model are two truths; one copy is one truth.

**The limit of the decision:** the WebAssembly bridge cannot depend on the
UniFFI bridge, because UniFFI is not part of a WebAssembly module. The
WebAssembly bridge therefore carries its own conversion of the wire model
(`platform/phomu-wasm/src/config.rs`, `platform/phomu-wasm/src/catalogue.rs`).
This duplication is an **open decision** for the Owner — see the delivery
report of the milestone P0.

---

## Consequences

### Positive

- A change of the exported surface cannot pass unnoticed: the fingerprint test
  fails until the version is raised.
- The version has exactly one definition; the bridges and the header cannot
  disagree with the base.
- The generated header is a build artefact, not a document that drifts.
- The C-ABI bridge and the UniFFI bridge cannot drift apart: they share the
  wire model, the registry and the error mapping.

### Negative

- The fingerprint is a second number next to the version. It has to be
  updated in the same commit as the version — which is exactly the intent,
  but it is a step a developer can forget.
- The WebAssembly bridge carries a second copy of the wire model. The
  duplication is bounded (the conversion of the configuration and of the
  catalogue) but it exists, and it is not checked by a test yet.
- The rule table of the gate grows an exception. An exception that is not
  named in an ADR decays into a convention; this ADR is the name.

### What the decision makes impossible

- A bridge that exports a symbol which is not in `EXPORTED_FUNCTIONS`.
- A bridge that declares a version of its own.
- A hand-edited C header.
- A change of the exported surface without a change of the ABI version.

---

## Alternatives considered

- **A checksum of the whole library.** *Rejected:* the checksum changes with
  every internal change, so it cannot express "the surface changed". It would
  make every release a major release.
- **No fingerprint, the version only.** *Rejected:* the version is a promise
  of the developer; the fingerprint is a measurement of the code. The rule
  needs the measurement, otherwise it is a convention.
- **The fingerprint only, no version.** *Rejected:* the shell needs a number
  it can compare against its bracket; the fingerprint is not a version.
- **A committed baseline of the generated bindings.** *Rejected as the
  primary mechanism:* it detects a change of the generated code, but it does
  not say *which* symbols changed, and the diff of a generated file of
  4 720 lines is unreadable. The test of the generated bindings
  (`platform/phomu-ffi/tests/generated_bindings.rs`) checks the baseline
  nevertheless — it compares the generated code against the list of the
  surface.

---

## Verification

| Check | Command / place |
|---|---|
| The version of the base is the version of the bridges | `cargo test -p phomu-ffi --test roundtrip -- the_abi_version_is_part_of_the_surface` |
| The fingerprint of the surface is stable | `cargo test -p phomu-ffi --test roundtrip -- the_surface_fingerprint_is_stable` |
| The generated bindings carry the whole surface | `cargo test -p phomu-ffi --test generated_bindings` |
| The header carries the version of the library | `cargo test -p phomu-capi --test capi -- the_header_carries_the_version_of_the_library` |
| The header and the Rust source agree | `node scripts/check-crate-boundaries.mjs` |
| A change of the surface raises the version | the fingerprint test fails; the expectation and the version are changed in the same commit |
