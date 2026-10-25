//! The closed message-key space of the Phomu base.
//!
//! WHAT: a closed enumeration of the message keys the base can emit
//! ([`MessageKey`]), the mapping of a game event onto a key
//! ([`GameEvent`]) and the list of the supported languages ([`Language`]).
//!
//! WHY: the base supplies the *keys*, the shells supply the *texts*
//! (docs/design/BUILD-CONTRACT.md § 6.1, rule L-1). A base that carried
//! sentences would make the texts part of the binary and would force a new
//! release of every shell for every new language. Because the key type is an
//! enumeration, a key that does not exist cannot be emitted — the closure is
//! a compile-time property, not a review rule.
//!
//! **This crate contains no translated text.** Every string in it is a key:
//! a dot-separated, camelCase identifier without a placeholder. The
//! placeholder lives in the *value* of the message, never in the key
//! (rule L-2).
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_i18n::{GameEvent, MessageKey, message_key};
//!
//! let key = message_key(GameEvent::AnswerCorrect);
//! assert_eq!(key, MessageKey::GameFeedbackCorrect);
//! assert_eq!(key.as_str(), "game.feedback.correct");
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod events;
mod keys;

pub use events::{GameEvent, message_key};
pub use keys::MessageKey;

/// A language the base can address.
///
/// WHY: the base never reads a locale file, but it knows which locales the
/// shells are expected to provide, so that a shell can check its own
/// completeness against the list.
///
/// EXAMPLE: `Language::De` is the German locale of the shells.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Language {
    /// German.
    De,
    /// English.
    En,
}

impl Language {
    /// Every supported language, in the order of the reference
    /// implementation (`src/config/game-config.ts:76`).
    ///
    /// EXAMPLE: `Language::ALL` has two entries.
    pub const ALL: &'static [Language] = &[Language::De, Language::En];

    /// The language of a locale identifier, for example `"de"` or `"en-GB"`.
    ///
    /// WHY: a shell receives the locale of the browser; the primary subtag
    /// decides the language, the region does not change it.
    ///
    /// Returns `None` for an unknown language.
    ///
    /// EXAMPLE: `Language::from_locale("de-CH")` is `Some(Language::De)`.
    pub fn from_locale(locale: &str) -> Option<Self> {
        let primary = locale.split(['-', '_']).next().unwrap_or(locale);
        match primary {
            "de" => Some(Language::De),
            "en" => Some(Language::En),
            _ => None,
        }
    }

    /// The locale identifier of the language.
    ///
    /// WHY: the identifier is the key of the locale files of the shells.
    ///
    /// EXAMPLE: `Language::De.as_str()` is `"de"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            Language::De => "de",
            Language::En => "en",
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{GameEvent, Language, MessageKey, message_key};

    #[test]
    fn every_key_is_dot_separated_and_camel_case() {
        for key in MessageKey::ALL {
            let text = key.as_str();
            assert!(text.contains('.'), "{text} has no namespace");
            assert!(!text.contains(' '), "{text} contains a space");
            assert!(!text.contains('{'), "{text} contains a placeholder");
            assert!(!text.ends_with('.'), "{text} ends with a dot");
            for part in text.split('.') {
                let mut characters = part.chars();
                let first = characters.next().unwrap_or(' ');
                assert!(first.is_ascii_lowercase(), "{text} is not camelCase");
            }
        }
    }

    #[test]
    fn the_key_space_is_closed() {
        // A key that is not in the enumeration cannot be named, therefore the
        // reverse lookup has to fail for it.
        assert!(MessageKey::from_key("game.doesNotExist").is_none());
        assert_eq!(
            MessageKey::from_key("game.feedback.correct"),
            Some(MessageKey::GameFeedbackCorrect)
        );
    }

    #[test]
    fn every_event_maps_onto_a_key() {
        for event in GameEvent::ALL {
            let key = message_key(*event);
            assert!(MessageKey::ALL.contains(&key));
        }
    }

    #[test]
    fn the_locale_is_parsed_by_its_primary_subtag() {
        assert_eq!(Language::from_locale("de"), Some(Language::De));
        assert_eq!(Language::from_locale("de-CH"), Some(Language::De));
        assert_eq!(Language::from_locale("en-GB"), Some(Language::En));
        assert_eq!(Language::from_locale("fr"), None);
    }
}
