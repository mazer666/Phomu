package de.phomu.bridge

/**
 * The vocabulary of the wire between the shell and the base.
 *
 * WHAT: the identifiers the bridge accepts for the values of a session
 * configuration — the modes, the team modes, the ending conditions, the
 * governance, the policies and the providers.
 *
 * WHY the vocabulary lives here and not in the base: the identifiers are the
 * *protocol* between the shell and the base, not a rule. The bridge defines
 * them in `platform/phomu-ffi/src/core_api.rs`; a client of a protocol names
 * the values of the protocol. What the shell must not do is decide *which*
 * value is used — that is the product decision of the lobby, and the
 * defaults come from the generated projection of the configuration.
 *
 * WHY the list is open to a finding: the base does not export the vocabulary,
 * so a shell has to name the identifiers of the protocol itself. The base
 * should export it, and the list below would disappear.
 *
 * EXAMPLE: `BridgeVocabulary.TEAM_MODE_INDIVIDUAL` is the identifier the
 * bridge accepts for the team mode "individual".
 */
object BridgeVocabulary {

    // ── The modes of the game ──────────────────────────────────────────────
    // WHY the identifiers are hyphenated: the bridge parses them with
    // `GameMode::from_str`, which knows exactly these spellings.

    /** The mode "timeline". */
    const val MODE_TIMELINE: String = "timeline"

    /** The mode "hint-master". */
    const val MODE_HINT_MASTER: String = "hint-master"

    /** The mode "lyrics". */
    const val MODE_LYRICS: String = "lyrics"

    /** The mode "vibe-check". */
    const val MODE_VIBE_CHECK: String = "vibe-check"

    /** The mode "survivor". */
    const val MODE_SURVIVOR: String = "survivor"

    /** The mode "cover-confusion". */
    const val MODE_COVER_CONFUSION: String = "cover-confusion"

    /** Every mode the base knows, in the order the lobby shows them. */
    val ALL_MODES: List<String> = listOf(
        MODE_TIMELINE,
        MODE_HINT_MASTER,
        MODE_LYRICS,
        MODE_VIBE_CHECK,
        MODE_SURVIVOR,
        MODE_COVER_CONFUSION,
    )

    // ── The team modes ─────────────────────────────────────────────────────

    /** The team mode "individual". */
    const val TEAM_MODE_INDIVIDUAL: String = "individual"

    /** The team mode "fixed". */
    const val TEAM_MODE_FIXED: String = "fixed"

    /** The team mode "shifting". */
    const val TEAM_MODE_SHIFTING: String = "shifting"

    /** Every team mode the base knows. */
    val ALL_TEAM_MODES: List<String> = listOf(
        TEAM_MODE_INDIVIDUAL,
        TEAM_MODE_FIXED,
        TEAM_MODE_SHIFTING,
    )

    // ── The device modes ───────────────────────────────────────────────────

    /**
     * The device mode "pass-the-phone".
     *
     * WHY it is the only one the shell offers: the multi-device session is
     * deferred for the whole programme
     * (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-123).
     */
    const val DEVICE_MODE_PASS_THE_PHONE: String = "pass-the-phone"

    // ── The ending conditions ──────────────────────────────────────────────

    /** The ending condition "points". */
    const val ENDING_CONDITION_POINTS: String = "points"

    /** The ending condition "rounds". */
    const val ENDING_CONDITION_ROUNDS: String = "rounds"

    /** The ending condition "time". */
    const val ENDING_CONDITION_TIME: String = "time"

    /** Every ending condition the base knows. */
    val ALL_ENDING_CONDITIONS: List<String> = listOf(
        ENDING_CONDITION_POINTS,
        ENDING_CONDITION_ROUNDS,
        ENDING_CONDITION_TIME,
    )

    // ── The governance and the policies ────────────────────────────────────

    /** The governance "host". */
    const val OVERRIDE_GOVERNANCE_HOST: String = "host"

    /** The governance "co-host". */
    const val OVERRIDE_GOVERNANCE_CO_HOST: String = "co-host"

    /** The governance "majority". */
    const val OVERRIDE_GOVERNANCE_MAJORITY: String = "majority"

    /** Every governance the base knows. */
    val ALL_OVERRIDE_GOVERNANCES: List<String> = listOf(
        OVERRIDE_GOVERNANCE_HOST,
        OVERRIDE_GOVERNANCE_CO_HOST,
        OVERRIDE_GOVERNANCE_MAJORITY,
    )

    /** The hint release policy "auto-publish". */
    const val HINT_RELEASE_POLICY_AUTO_PUBLISH: String = "auto-publish"

    /** The hint release policy "manual-review". */
    const val HINT_RELEASE_POLICY_MANUAL_REVIEW: String = "manual-review"

    /** Every hint release policy the base knows. */
    val ALL_HINT_RELEASE_POLICIES: List<String> = listOf(
        HINT_RELEASE_POLICY_AUTO_PUBLISH,
        HINT_RELEASE_POLICY_MANUAL_REVIEW,
    )

    /**
     * The queue strategy "queue-retry".
     *
     * WHY it is not "queue-retry-pending": the reference implementation of
     * the web shell names the same strategy differently
     * (`src/config/game-config.ts`, `DEFAULT_AI_QUEUE_STRATEGY`). The bridge
     * accepts "queue-retry" and maps it onto the strategy of the base.
     */
    const val AI_QUEUE_STRATEGY_QUEUE_RETRY: String = "queue-retry"

    /** The queue strategy "fail-fast". */
    const val AI_QUEUE_STRATEGY_FAIL_FAST: String = "fail-fast"

    /** Every queue strategy the base knows. */
    val ALL_AI_QUEUE_STRATEGIES: List<String> = listOf(
        AI_QUEUE_STRATEGY_QUEUE_RETRY,
        AI_QUEUE_STRATEGY_FAIL_FAST,
    )

    /** The elimination rule that keeps every player in the game. */
    const val ELIMINATION_RULE_NONE: String = "none"

    // ── The difficulties and the providers ──────────────────────────────────

    /** The difficulty filter that keeps every song of the catalogue. */
    const val DIFFICULTY_ALL: String = "all"

    /** The difficulty "easy". */
    const val DIFFICULTY_EASY: String = "easy"

    /** The difficulty "medium". */
    const val DIFFICULTY_MEDIUM: String = "medium"

    /** The difficulty "hard". */
    const val DIFFICULTY_HARD: String = "hard"

    /** Every difficulty the base knows. */
    val ALL_DIFFICULTIES: List<String> = listOf(
        DIFFICULTY_EASY,
        DIFFICULTY_MEDIUM,
        DIFFICULTY_HARD,
    )

    /** The provider "youtube". */
    const val PROVIDER_YOUTUBE: String = "youtube"

    /** The provider "spotify-free". */
    const val PROVIDER_SPOTIFY_FREE: String = "spotify-free"

    /** The provider "spotify-premium". */
    const val PROVIDER_SPOTIFY_PREMIUM: String = "spotify-premium"

    /** The provider "amazon-music". */
    const val PROVIDER_AMAZON_MUSIC: String = "amazon-music"

    /** The provider "amazon-music-premium". */
    const val PROVIDER_AMAZON_MUSIC_PREMIUM: String = "amazon-music-premium"

    /** The provider "apple-music". */
    const val PROVIDER_APPLE_MUSIC: String = "apple-music"

    /** Every provider the base knows. */
    val ALL_PROVIDERS: List<String> = listOf(
        PROVIDER_YOUTUBE,
        PROVIDER_SPOTIFY_FREE,
        PROVIDER_SPOTIFY_PREMIUM,
        PROVIDER_AMAZON_MUSIC,
        PROVIDER_AMAZON_MUSIC_PREMIUM,
        PROVIDER_APPLE_MUSIC,
    )

    // ── The sources of a draw ──────────────────────────────────────────────

    /** The source of a draw that the base chooses from the catalogue. */
    const val DRAW_SOURCE_RANDOM: String = "random"

    /** The source of a draw that a scanned card carries. */
    const val DRAW_SOURCE_QR: String = "qr"

    // ── The kinds of a media source ────────────────────────────────────────

    /** The kind "embed" — a player inside a browser. */
    const val MEDIA_KIND_EMBED: String = "embed"

    /** The kind "preview-audio" — a plain audio file. */
    const val MEDIA_KIND_PREVIEW_AUDIO: String = "preview-audio"

    /** The kind "deep-link" — the installed application of a provider. */
    const val MEDIA_KIND_DEEP_LINK: String = "deep-link"
}
