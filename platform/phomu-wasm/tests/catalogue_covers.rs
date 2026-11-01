//! Cover fields in the exported catalogue must reach both shells.
#![allow(clippy::unwrap_used, clippy::expect_used)]
use serde_json::json;

#[test]
fn root_cover_wins_and_legacy_links_remain_supported() {
    for (root, nested, expected) in [
        (
            Some("/covers/root.jpg"),
            Some("/covers/old.jpg"),
            Some("/covers/root.jpg"),
        ),
        (None, Some("/covers/old.jpg"), Some("/covers/old.jpg")),
        (Some(""), Some("/covers/old.jpg"), Some("/covers/old.jpg")),
        (None, None, None),
    ] {
        let value = json!({"id":"cover-test", "difficulty":"easy", "coverUrl":root,
            "links":{"coverUrl":nested}});
        let song = phomu_wasm::catalogue::read_song(&value).expect("valid catalogue record");
        assert_eq!(song.cover_url.as_deref(), expected);
    }
}
