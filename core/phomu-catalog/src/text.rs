//! Text helpers of the catalogue validation.
//!
//! WHAT: the normalisation used for the comparison of two strings and the
//! small predicates the validation needs.
//!
//! WHY: the catalogue is written by humans, with different spellings and
//! different punctuation. A comparison that does not normalise first
//! reports a spoiler where there is none.

/// Normalises a text for the comparison of two strings.
///
/// WHY: the catalogue is written by humans, with different spellings and
/// different punctuation; a comparison that does not normalise first
/// reports a spoiler where there is none.
///
/// The reference implementation decomposes the text canonically, removes the
/// diacritics, lower-cases it and replaces everything that is not a letter
/// or a digit by a space (`src/utils/validate-song-data.ts:74-82`). The base
/// performs the same steps; the canonical decomposition is approximated by
/// an explicit table of the Latin characters that occur in the catalogue.
///
/// EXAMPLE: `normalize_for_comparison("Björk!")` is `"bjork"`.
pub fn normalize_for_comparison(value: &str) -> String {
    let mut result = String::with_capacity(value.len());
    let mut previous_was_space = true;
    for character in value.chars() {
        let folded = fold_character(character);
        if folded.is_ascii_alphanumeric() {
            result.push(folded.to_ascii_lowercase());
            previous_was_space = false;
        } else if !previous_was_space {
            result.push(' ');
            previous_was_space = true;
        }
    }
    result.trim().to_string()
}

/// Folds one character onto its base form.
fn fold_character(character: char) -> char {
    match character {
        'à' | 'á' | 'â' | 'ã' | 'ä' | 'å' | 'À' | 'Á' | 'Â' | 'Ã' | 'Ä' | 'Å' => 'a',
        'æ' | 'Æ' => 'a',
        'ç' | 'Ç' => 'c',
        'è' | 'é' | 'ê' | 'ë' | 'È' | 'É' | 'Ê' | 'Ë' => 'e',
        'ì' | 'í' | 'î' | 'ï' | 'Ì' | 'Í' | 'Î' | 'Ï' => 'i',
        'ñ' | 'Ñ' => 'n',
        'ò' | 'ó' | 'ô' | 'õ' | 'ö' | 'Ò' | 'Ó' | 'Ô' | 'Õ' | 'Ö' => 'o',
        'ù' | 'ú' | 'û' | 'ü' | 'Ù' | 'Ú' | 'Û' | 'Ü' => 'u',
        'ý' | 'ÿ' | 'Ý' | 'Ÿ' => 'y',
        'ß' => 's',
        'š' | 'Š' => 's',
        'ž' | 'Ž' => 'z',
        'č' | 'Č' => 'c',
        'ř' | 'Ř' => 'r',
        'ě' | 'Ě' => 'e',
        'ů' | 'Ů' => 'u',
        'ł' | 'Ł' => 'l',
        'ő' | 'Ő' => 'o',
        'ű' | 'Ű' => 'u',
        other => other,
    }
}

/// Whether a string is an ISO 3166-1 alpha-2 country code.
///
/// WHY: the country of an entry is used for the sorting of the catalogue
/// and for the filter of the admin tool; the code has to be the
/// standardised one (`src/utils/validate-song-data.ts:185`).
///
/// EXAMPLE: `is_country_code("DE")` is `true`, `is_country_code("de")` is
/// `false`.
pub fn is_country_code(value: &str) -> bool {
    value.len() == 2 && value.chars().all(|c| c.is_ascii_uppercase())
}

/// Whether a string is an HTTP or HTTPS URL.
///
/// WHY: the sources of the hints and the preview links of the providers have
/// to be reachable from a browser; the check is the one of the reference
/// implementation (`src/utils/validate-song-data.ts:509`).
///
/// EXAMPLE: `is_http_url("https://example.org")` is `true`,
/// `is_http_url("example.org")` is `false`.
pub fn is_http_url(value: &str) -> bool {
    value.starts_with("http://") || value.starts_with("https://")
}

/// Whether a YouTube value is a placeholder that still needs a verification
/// (`src/utils/validate-song-data.ts:59-61`).
///
/// WHY: a placeholder is a value the maintainer has not verified yet; it
/// must not be treated as a broken link but as an unfinished entry.
///
/// EXAMPLE: `is_youtube_placeholder("TODO: prüfen")` is `true`.
pub fn is_youtube_placeholder(value: &str) -> bool {
    value.starts_with("TODO:") || value.is_empty() || value == "PLACEHOLDER"
}

/// Whether a string is a YouTube video identifier
/// (`src/utils/validate-song-data.ts:64-67`).
///
/// WHY: the identifier is exactly eleven characters long; a longer or
/// shorter value is a URL and not an identifier.
///
/// EXAMPLE: `is_youtube_video_id("abcdefghijk")` is `true`.
pub fn is_youtube_video_id(value: &str) -> bool {
    value.len() == 11
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// Whether a string is a YouTube URL (`src/utils/validate-song-data.ts:70-72`).
///
/// WHY: the catalogue carries both identifiers and URLs; the validation has
/// to accept both.
///
/// EXAMPLE: `is_youtube_url("https://youtu.be/abcdefghijk")` is `true`.
pub fn is_youtube_url(value: &str) -> bool {
    value.contains("youtube.com/watch?v=") || value.contains("youtu.be/")
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{
        is_country_code, is_http_url, is_youtube_placeholder, is_youtube_url, is_youtube_video_id,
        normalize_for_comparison,
    };

    #[test]
    fn the_normalisation_removes_diacritics_and_punctuation() {
        assert_eq!(normalize_for_comparison("Blaue Laterne!"), "blaue laterne");
        assert_eq!(normalize_for_comparison("Björk"), "bjork");
        assert_eq!(normalize_for_comparison("  A  B "), "a b");
        assert_eq!(normalize_for_comparison(""), "");
    }

    #[test]
    fn the_country_code_needs_two_upper_case_letters() {
        assert!(is_country_code("DE"));
        assert!(!is_country_code("de"));
        assert!(!is_country_code("DEU"));
    }

    #[test]
    fn the_url_predicate_needs_a_scheme() {
        assert!(is_http_url("https://example.org"));
        assert!(!is_http_url("example.org"));
    }

    #[test]
    fn the_youtube_predicates_match_the_reference() {
        assert!(is_youtube_video_id("abcdefghijk"));
        assert!(!is_youtube_video_id("short"));
        assert!(is_youtube_url(
            "https://www.youtube.com/watch?v=abcdefghijk"
        ));
        assert!(is_youtube_url("https://youtu.be/abcdefghijk"));
        assert!(is_youtube_placeholder("TODO: check"));
        assert!(is_youtube_placeholder(""));
    }
}
