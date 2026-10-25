//! A stand-in for a crate that reaches into another crate with include!.
// THE VIOLATION: the included file lives outside this crate's directory.
include!("../../../platform/phomu-ffi/src/lib.rs");
