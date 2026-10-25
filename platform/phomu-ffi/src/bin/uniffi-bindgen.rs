//! The generator of the foreign-language bindings.
//!
//! WHAT: the `uniffi-bindgen` binary of the bridge. It generates the Kotlin
//! and the Swift bindings from the compiled library.
//!
//! WHY: the bindings are generated and never written by hand
//! (docs/design/BUILD-CONTRACT.md § 2.4, rule B-6). A hand-edited binding
//! is a build failure, not a review remark.
//!
//! EXAMPLE:
//!
//! ```text
//! cargo run -p phomu-ffi --bin uniffi-bindgen -- generate \
//!     --library target/debug/libphomu_ffi.so \
//!     --language kotlin --out-dir platform/phomu-ffi/bindings/kotlin
//! ```

fn main() {
    uniffi::uniffi_bindgen_main()
}
