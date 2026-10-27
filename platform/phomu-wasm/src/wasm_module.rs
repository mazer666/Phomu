//! The export section of a WebAssembly module.
//!
//! WHAT: a reader for the export section of a `.wasm` file — the list of the
//! symbols the module offers to the host.
//!
//! WHY the bridge reads its own artefact: the declaration of the surface
//! ([`crate::surface`]) is the contract, and the export section of the built
//! module is the truth a shell sees. The test of the surface compares the
//! two, so that a symbol which is declared but not exported — or exported
//! but not declared — fails the build
//! (docs/qa/QA-11-RUST-BASE.md, QA-RST-001).
//!
//! WHY the reader is written here and not taken from a crate: the base of
//! the project has no third-party dependency at run time, and the export
//! section is a stable part of the format of WebAssembly.
//!
//! EXAMPLE: the module of the bridge exports the function
//! `phomu_session_timeout`.

/// The identifier of the export section.
const SECTION_EXPORT: u8 = 7;

/// The kind of an export that is a function.
const KIND_FUNCTION: u8 = 0;

/// The number of the hexadecimal characters of the suffix of wasm-bindgen.
const MANGLED_SUFFIX: usize = 16;

/// The failure of the reader.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModuleError {
    /// The file does not start with the magic number of WebAssembly.
    NotAModule,
    /// The file ends in the middle of a value.
    UnexpectedEnd,
    /// The export section is not there.
    NoExportSection,
}

impl core::fmt::Display for ModuleError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            ModuleError::NotAModule => write!(f, "the artefact is not a WebAssembly module"),
            ModuleError::UnexpectedEnd => write!(f, "the artefact ends in the middle of a value"),
            ModuleError::NoExportSection => write!(f, "the module has no export section"),
        }
    }
}

/// The names of the functions the module exports.
///
/// WHY the names are the raw ones: the caller decides what to do with the
/// mangling of wasm-bindgen.
///
/// # Errors
/// Returns the error [`ModuleError`] when the artefact is not a module or
/// when it ends in the middle of a value.
pub fn exported_functions(bytes: &[u8]) -> Result<Vec<String>, ModuleError> {
    if bytes.get(0..4) != Some(b"\0asm".as_slice()) {
        return Err(ModuleError::NotAModule);
    }
    let mut cursor = 8usize;
    while cursor < bytes.len() {
        let identifier = *bytes.get(cursor).ok_or(ModuleError::UnexpectedEnd)?;
        cursor += 1;
        let size = read_u32(bytes, &mut cursor)?;
        let start = cursor;
        let end = start
            .checked_add(size as usize)
            .filter(|end| *end <= bytes.len())
            .ok_or(ModuleError::UnexpectedEnd)?;
        if identifier == SECTION_EXPORT {
            return read_exports(bytes, start, end);
        }
        cursor = end;
    }
    Err(ModuleError::NoExportSection)
}

/// The names of the exported functions without the mangling of wasm-bindgen.
///
/// WHY: the mangling is a suffix of a hash that wasm-bindgen appends to
/// every exported symbol. A shell never sees it, and the declaration of the
/// surface therefore carries the plain name.
///
/// EXAMPLE: `phomu_session_timeout_0123456789abcdef` becomes
/// `phomu_session_timeout`.
pub fn plain_name(name: &str) -> &str {
    let Some((prefix, suffix)) = name.rsplit_once('_') else {
        return name;
    };
    if suffix.len() == MANGLED_SUFFIX
        && suffix
            .chars()
            .all(|character| character.is_ascii_hexdigit())
    {
        return prefix;
    }
    name
}

/// Reads the entries of the export section.
fn read_exports(bytes: &[u8], start: usize, end: usize) -> Result<Vec<String>, ModuleError> {
    let mut cursor = start;
    let count = read_u32(bytes, &mut cursor)?;
    let mut names = Vec::new();
    for _ in 0..count {
        let length = read_u32(bytes, &mut cursor)? as usize;
        let name_end = cursor
            .checked_add(length)
            .filter(|value| *value <= end)
            .ok_or(ModuleError::UnexpectedEnd)?;
        let name = bytes
            .get(cursor..name_end)
            .ok_or(ModuleError::UnexpectedEnd)?;
        cursor = name_end;
        let kind = *bytes.get(cursor).ok_or(ModuleError::UnexpectedEnd)?;
        cursor += 1;
        let _index = read_u32(bytes, &mut cursor)?;
        if kind == KIND_FUNCTION {
            names.push(String::from_utf8_lossy(name).into_owned());
        }
    }
    Ok(names)
}

/// Reads a variable-length number of the format of WebAssembly.
fn read_u32(bytes: &[u8], cursor: &mut usize) -> Result<u32, ModuleError> {
    let mut result: u32 = 0;
    let mut shift = 0u32;
    loop {
        let byte = *bytes.get(*cursor).ok_or(ModuleError::UnexpectedEnd)?;
        *cursor += 1;
        result |= u32::from(byte & 0x7f) << shift;
        if byte & 0x80 == 0 {
            return Ok(result);
        }
        shift += 7;
        if shift > 31 {
            return Err(ModuleError::UnexpectedEnd);
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{ModuleError, exported_functions, plain_name};

    #[test]
    fn a_file_that_is_not_a_module_is_refused() {
        assert_eq!(
            exported_functions(b"not a module"),
            Err(ModuleError::NotAModule)
        );
    }

    #[test]
    fn a_module_without_an_export_section_is_refused() {
        assert_eq!(
            exported_functions(b"\0asm\x01\x00\x00\x00"),
            Err(ModuleError::NoExportSection)
        );
    }

    #[test]
    fn the_mangling_of_wasm_bindgen_is_removed() {
        assert_eq!(
            plain_name("phomu_session_timeout_b6e0a3915819d4dd"),
            "phomu_session_timeout"
        );
        assert_eq!(plain_name("phomu_session_timeout"), "phomu_session_timeout");
        assert_eq!(plain_name("phomu_a_b"), "phomu_a_b");
    }
}
