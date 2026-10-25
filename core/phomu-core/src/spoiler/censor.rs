//! The censoring of the hints.
//!
//! WHAT: [`censor_hint`] replaces every token of the artist or of the title
//! in a hint with `[XXX]`.
//!
//! WHY: a hint that names the song destroys the round. The censoring is
//! performed in the base, so that a shell cannot forget it and cannot weaken
//! it (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-109).
//!
//! The rule is the one of `src/utils/censor-utils.ts:11-59`: a token of at
//! least four characters is censored, a shorter token only when it is listed
//! in the exceptions, and the words of the ignore list are never censored.

use phomu_config::{
    SPOILER_EXCEPTIONS, SPOILER_IGNORE_WORDS, SPOILER_MIN_LENGTH, SPOILER_REPLACEMENT,
};

/// Censors a hint against the artist and the title.
///
/// WHY: the censorship is performed in the base, so that a shell cannot
/// forget it and cannot weaken it (docs/spec/REQUIREMENTS-PLATFORM.md,
/// CORE-109).
///
/// EXAMPLE: the hint `"Die Band sang das"` with the artist `"Die Band"`
/// becomes `"Die [XXX] sang das"` — "Die" is on the ignore list and stays.
pub fn censor_hint(hint: &str, artist: &str, title: &str) -> String {
    if hint.is_empty() {
        return String::new();
    }

    let mut tokens: Vec<String> = Vec::new();
    for text in [artist, title] {
        let cleaned_full = clean(text);
        if is_exception(&cleaned_full) {
            push_unique(&mut tokens, text.to_string());
        }
        for word in split_words(text) {
            let cleaned_word = clean(&word);
            if is_ignored(&cleaned_word) {
                continue;
            }
            if cleaned_word.chars().count() >= SPOILER_MIN_LENGTH || is_exception(&cleaned_word) {
                push_unique(&mut tokens, word);
            }
        }
    }

    // The longer tokens are replaced first, so that a phrase is replaced
    // before its parts.
    tokens.sort_by_key(|token| std::cmp::Reverse(token.chars().count()));

    let mut censored = hint.to_string();
    for token in tokens {
        if token.is_empty() {
            continue;
        }
        let word_boundary = token.chars().count() < SPOILER_MIN_LENGTH;
        censored = replace_ignore_case(&censored, &token, SPOILER_REPLACEMENT, word_boundary);
    }
    censored
}

/// Removes everything that is not an ASCII letter or digit and upper-cases
/// the rest.
fn clean(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

/// Whether a cleaned token is one of the exceptions.
fn is_exception(cleaned: &str) -> bool {
    SPOILER_EXCEPTIONS
        .iter()
        .any(|exception| clean(exception) == cleaned)
}

/// Whether a cleaned token is one of the words that are never censored.
fn is_ignored(cleaned: &str) -> bool {
    SPOILER_IGNORE_WORDS
        .iter()
        .any(|ignored| clean(ignored) == cleaned)
}

/// Splits a text at the separators of the reference implementation
/// (`src/utils/censor-utils.ts:26`).
fn split_words(text: &str) -> Vec<String> {
    text.split(|c: char| c.is_whitespace() || c == '-' || c == '&' || c == ',' || c == '/')
        .filter(|word| !word.is_empty())
        .map(str::to_string)
        .collect()
}

/// Adds a token, if it is not already in the list.
fn push_unique(tokens: &mut Vec<String>, token: String) {
    if !tokens.iter().any(|existing| existing == &token) {
        tokens.push(token);
    }
}

/// Replaces every occurrence of a token, ignoring the case.
///
/// WHY: the reference implementation uses a regular expression with the
/// `i` flag. For a token of less than four characters it adds word
/// boundaries, so that "BTS" does not replace the letters inside another
/// word.
///
/// EXAMPLE: `"BTS"` in `"BTS and bts"` becomes `"[XXX] and [XXX]"`.
fn replace_ignore_case(
    haystack: &str,
    needle: &str,
    replacement: &str,
    word_boundary: bool,
) -> String {
    if needle.is_empty() {
        return haystack.to_string();
    }
    let characters: Vec<char> = haystack.chars().collect();
    let needle_length = needle.chars().count();
    let needle_lower = needle.to_lowercase();
    let mut result = String::with_capacity(haystack.len());
    let mut index = 0;

    while index < characters.len() {
        let slice: String = characters
            .get(index..index.saturating_add(needle_length))
            .map(<[char]>::iter)
            .unwrap_or_default()
            .collect();
        let fits = slice.chars().count() == needle_length;
        let boundary_ok = !word_boundary || is_outside_a_word(&characters, index, needle_length);
        if fits && slice.to_lowercase() == needle_lower && boundary_ok {
            result.push_str(replacement);
            index += needle_length;
            continue;
        }
        if let Some(character) = characters.get(index) {
            result.push(*character);
        }
        index += 1;
    }
    result
}

/// Whether the token that starts at `index` lies outside of a word.
///
/// WHY: the regular expression of the reference implementation uses `\b`,
/// whose word characters are the ASCII letters, the digits and the
/// underscore. A token of less than four characters must therefore not
/// replace a part of another word.
fn is_outside_a_word(characters: &[char], index: usize, length: usize) -> bool {
    let previous_is_word = index
        .checked_sub(1)
        .and_then(|previous| characters.get(previous))
        .is_some_and(|character| is_word_character(*character));
    let next_is_word = characters
        .get(index.saturating_add(length))
        .is_some_and(|character| is_word_character(*character));
    !previous_is_word && !next_is_word
}

/// Whether a character is a word character.
///
/// The regular expression of the reference implementation uses `\b`, whose
/// word characters are the ASCII letters, the digits and the underscore.
fn is_word_character(character: char) -> bool {
    character.is_ascii_alphanumeric() || character == '_'
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::censor_hint;

    #[test]
    fn the_artist_in_the_hint_is_censored() {
        assert_eq!(
            censor_hint("Die Band sang das", "Die Band", "Ein Lied"),
            "Die [XXX] sang das"
        );
    }

    #[test]
    fn the_title_in_the_hint_is_censored() {
        assert_eq!(
            censor_hint("Ein Lied von 1985", "Die Band", "Ein Lied"),
            "Ein [XXX] von 1985"
        );
    }

    #[test]
    fn a_short_name_is_censored_only_when_it_is_an_exception() {
        assert_eq!(censor_hint("BTS sang", "BTS", "Titel"), "[XXX] sang");
        assert_eq!(censor_hint("ABC sang", "ABC", "Titel"), "[XXX] sang");
    }

    #[test]
    fn a_short_name_that_is_no_exception_stays() {
        assert_eq!(censor_hint("UFO sang", "UFO", "Titel"), "UFO sang");
    }

    #[test]
    fn the_ignore_list_is_honoured() {
        // "The" is on the ignore list and therefore never censored.
        assert_eq!(
            censor_hint("The Band sang", "The Band", "Titel"),
            "The [XXX] sang"
        );
        // A title that consists only of ignored words is not censored.
        assert_eq!(censor_hint("The Song sang", "And", "The"), "The Song sang");
    }

    #[test]
    fn an_empty_hint_stays_empty() {
        assert_eq!(censor_hint("", "Die Band", "Titel"), "");
    }

    #[test]
    fn a_hint_without_the_answer_stays_untouched() {
        assert_eq!(
            censor_hint("Ein Synthesizer im Jahr 1985", "Die Band", "Titel"),
            "Ein Synthesizer im Jahr 1985"
        );
    }

    #[test]
    fn the_censoring_ignores_the_case() {
        assert_eq!(
            censor_hint("die band sang", "Die Band", "Titel"),
            "die [XXX] sang"
        );
    }

    #[test]
    fn a_short_token_respects_the_word_boundary() {
        assert_eq!(censor_hint("BTSX sang", "BTS", "Titel"), "BTSX sang");
    }
}
