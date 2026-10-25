//! The helpers of the C-ABI bridge.
//!
//! WHAT: the buffer that owns the strings the library returns and the
//! helpers that write a failure or a value into the arguments of the caller.
//!
//! WHY a buffer: a C caller must not free the strings of the library. The
//! library therefore keeps them in a buffer of the thread and replaces them
//! with the next call — the header documents the lifetime.

use std::cell::RefCell;
use std::ffi::{CStr, CString};

/// The empty string the buffer starts with.
fn empty() -> CString {
    // WHY: an empty string never carries a null byte, so the construction
    // cannot fail. The `unwrap_or_else` is the fallback for the impossible
    // case; it is not a panic path of the product.
    CString::new("").unwrap_or_else(|_| CString::default())
}

use phomu_ffi::error::PhomuError;

use crate::{PHOMU_ERROR, PHOMU_OK, PhomuErrorC};

// The buffer of the strings the library returns.
//
// WHY two buffers: a failure carries two strings — the message key and the
// context — and both have to stay valid at the same time.
thread_local! {
    static BUFFER: RefCell<CString> = RefCell::new(empty());
    static CONTEXT: RefCell<CString> = RefCell::new(empty());
}

/// The string of a text, owned by the library.
pub(crate) fn owned(text: &str) -> *const std::os::raw::c_char {
    BUFFER.with(|buffer| {
        let mut buffer = buffer.borrow_mut();
        *buffer = CString::new(text).unwrap_or_else(|_| empty());
        buffer.as_ptr()
    })
}

/// The string of the context of a failure, owned by the library.
pub(crate) fn owned_context(text: &str) -> *const std::os::raw::c_char {
    CONTEXT.with(|buffer| {
        let mut buffer = buffer.borrow_mut();
        *buffer = CString::new(text).unwrap_or_else(|_| empty());
        buffer.as_ptr()
    })
}

/// The text of a C string.
///
/// # Safety
/// The caller has to pass a valid null-terminated string or a null pointer.
pub(crate) unsafe fn text_of(pointer: *const std::os::raw::c_char) -> String {
    if pointer.is_null() {
        return String::new();
    }
    // SAFETY: the caller guarantees a valid null-terminated string.
    unsafe { CStr::from_ptr(pointer) }
        .to_string_lossy()
        .into_owned()
}

/// Write a failure into the error of the caller.
pub(crate) fn fail(error: *mut PhomuErrorC, failure: &PhomuError) -> i32 {
    if !error.is_null() {
        let context = serde_json::to_string(failure.context()).unwrap_or_else(|_| "{}".to_string());
        // SAFETY: the caller guarantees a pointer to a `PhomuErrorC` that it
        // owns; the two strings belong to the library.
        unsafe {
            (*error).code = failure.code();
            (*error).message_key = owned(failure.message_key());
            (*error).context = owned_context(&context);
        }
    }
    PHOMU_ERROR
}

/// Write a value into the output of the caller.
pub(crate) fn succeed<T: serde::Serialize>(
    out: *mut *const std::os::raw::c_char,
    value: &T,
) -> i32 {
    let json = match serde_json::to_string(value) {
        Ok(json) => json,
        Err(_) => return PHOMU_ERROR,
    };
    if !out.is_null() {
        // SAFETY: the caller guarantees a pointer to a pointer it owns.
        unsafe { *out = owned(&json) };
    }
    PHOMU_OK
}
