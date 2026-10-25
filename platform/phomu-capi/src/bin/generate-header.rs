//! The generator of the header of the C-ABI bridge.
//!
//! WHAT: the program that writes `include/phomu.h` — the header an embedder
//! includes.
//!
//! WHY a generator: the header carries the ABI version, and a header that
//! disagrees with the library is a build failure and not a runtime surprise
//! (docs/design/BUILD-CONTRACT.md § 3.1). The version comes from the base,
//! so the header cannot carry a number of its own.
//!
//! EXAMPLE:
//!
//! ```text
//! cargo run -p phomu-capi --bin phomu-capi-header
//! ```

use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

/// The header of the C-ABI bridge.
const HEADER: &str = r#"/* The header of the C-ABI bridge of Phomu.
 *
 * GENERATED FILE — do not edit it by hand. It is written by
 * `cargo run -p phomu-capi --bin phomu-capi-header`.
 *
 * The complex values cross the boundary as JSON. The format is stable within
 * a major version of the ABI (BRIDGE-110). The strings that the library
 * returns belong to the library and stay valid until the next call of the
 * same thread.
 */
#ifndef PHOMU_H
#define PHOMU_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* The status of a call that succeeded. */
#define PHOMU_OK 0
/* The status of a call that failed. */
#define PHOMU_ERROR 1

/* The version of the exported surface. */
#define PHOMU_ABI_VERSION_MAJOR __MAJOR__
#define PHOMU_ABI_VERSION_MINOR __MINOR__
#define PHOMU_ABI_VERSION_PATCH __PATCH__

/* A failure of the base: the stable code, the i18n key and the context.
 *
 * The two strings belong to the library and stay valid until the next call
 * of the same thread. The caller must not free them. */
typedef struct PhomuError {
  uint16_t code;
  const char *message_key;
  const char *context;
} PhomuError;

/* The version of the exported surface. */
uint16_t phomu_abi_version_major(void);
uint16_t phomu_abi_version_minor(void);
uint16_t phomu_abi_version_patch(void);
const char *phomu_abi_version_string(void);
const char *phomu_abi_versions_json(void);

/* The catalogue. */
int phomu_catalog_open(const char *source, uint64_t *out_handle, PhomuError *out_error);
int phomu_catalog_packs(uint64_t handle, const char **out_json, PhomuError *out_error);
int phomu_catalog_songs(uint64_t handle, const char *packs_json, const char **out_json,
                         PhomuError *out_error);

/* The session. */
int phomu_session_new(const char *config_json, const char *players_json, const char *teams_json,
                      uint64_t catalogue, int has_catalogue, uint64_t seed, uint64_t now_ms,
                      uint64_t *out_handle, PhomuError *out_error);
int phomu_session_snapshot(uint64_t handle, const char **out_json, PhomuError *out_error);
int phomu_session_start(uint64_t handle, uint64_t now_ms, const char **out_json,
                        PhomuError *out_error);
int phomu_session_draw(uint64_t handle, const char *source, const char *song_json,
                       const char **out_json, PhomuError *out_error);
int phomu_session_answer(uint64_t handle, const char *answer_json, int has_answered_in_seconds,
                         uint32_t answered_in_seconds, const char **out_json, PhomuError *out_error);
int phomu_session_reveal(uint64_t handle, const char **out_json, PhomuError *out_error);
int phomu_session_next_round(uint64_t handle, uint64_t now_ms, const char **out_json,
                             PhomuError *out_error);
int phomu_session_end(uint64_t handle, const char *winner_id, int has_winner, const char **out_json,
                      PhomuError *out_error);

/* The media plan and the message keys. */
int phomu_media_plan(uint64_t handle, const char **out_json, PhomuError *out_error);
const char *phomu_message_key(const char *event);

/* The capabilities the base offers for the declaration of a shell. */
int phomu_capabilities_json(const char *shell_json, const char **out_json, PhomuError *out_error);

#ifdef __cplusplus
}
#endif

#endif /* PHOMU_H */
"#;

fn main() -> ExitCode {
    let version = phomu_ffi::VERSION;
    let header = HEADER
        .replace("__MAJOR__", &version.major.to_string())
        .replace("__MINOR__", &version.minor.to_string())
        .replace("__PATCH__", &version.patch.to_string());

    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("include");
    path.push("phomu.h");
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Err(error) = fs::write(&path, header) {
        eprintln!("cannot write {}: {error}", path.display());
        return ExitCode::FAILURE;
    }
    println!("wrote {}", path.display());
    ExitCode::SUCCESS
}
