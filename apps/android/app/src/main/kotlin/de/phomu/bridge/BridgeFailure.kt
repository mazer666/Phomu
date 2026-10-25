package de.phomu.bridge

import org.phomu.bridge.PhomuException

/**
 * The failure of the base, as the shell classifies it.
 *
 * WHAT: the code, the message key and the context of a failure of the base.
 *
 * WHY the shell classifies failures instead of showing their text: the base
 * supplies a *message key*, the shell resolves the text in its own locale
 * files (docs/design/BUILD-CONTRACT.md § 6.1, rule L-7). A shell that shows
 * the text of the base would show it in the wrong language and could not
 * react to the failure.
 *
 * EXAMPLE: a session that is created with no player carries the code of
 * `InvalidPlayerCount` and the key `errors.invalidPlayerCount`.
 */
data class BridgeFailure(
    /** The stable numeric code of the failure. */
    val code: Int,
    /** The i18n key of the failure — never a sentence. */
    val messageKey: String,
    /** The context of the failure, by key. */
    val context: Map<String, String>,
) {
    /**
     * The value of one context entry, or `null` when the entry is absent.
     *
     * @param key the key of the entry
     * @return the value or `null`
     */
    fun contextValue(key: String): String? = context[key]
}

/**
 * Turns the failure of the bridge into the failure of the shell.
 *
 * WHY the variants are listed one by one: the generated exception has no
 * common interface — every variant carries its own copy of the code, the key
 * and the context. The list below is exhaustive over the sealed class, so
 * the compiler fails when the base adds a failure and the shell has not
 * learned to read it. That is the mechanism the build contract asks for
 * (docs/design/BUILD-CONTRACT.md § 2.4, rule B-2).
 *
 * @param failure the failure of the bridge
 * @return the failure of the shell
 */
fun PhomuException.toBridgeFailure(): BridgeFailure = when (this) {
    is PhomuException.InvalidConfiguration -> failure(code.toInt(), messageKey, context)
    is PhomuException.InvalidPlayerCount -> failure(code.toInt(), messageKey, context)
    is PhomuException.InvalidTeamCount -> failure(code.toInt(), messageKey, context)
    is PhomuException.UnknownPlayer -> failure(code.toInt(), messageKey, context)
    is PhomuException.UnknownTeam -> failure(code.toInt(), messageKey, context)
    is PhomuException.UnknownMode -> failure(code.toInt(), messageKey, context)
    is PhomuException.InvalidAnswer -> failure(code.toInt(), messageKey, context)
    is PhomuException.InvalidDifficulty -> failure(code.toInt(), messageKey, context)
    is PhomuException.EmptySelection -> failure(code.toInt(), messageKey, context)
    is PhomuException.InvalidDraw -> failure(code.toInt(), messageKey, context)
    is PhomuException.NotAvailableInPhase -> failure(code.toInt(), messageKey, context)
    is PhomuException.AnswersNotLocked -> failure(code.toInt(), messageKey, context)
    is PhomuException.NoSongDrawn -> failure(code.toInt(), messageKey, context)
    is PhomuException.GameAlreadyOver -> failure(code.toInt(), messageKey, context)
    is PhomuException.NoActivePlayer -> failure(code.toInt(), messageKey, context)
    is PhomuException.DuplicateAnswer -> failure(code.toInt(), messageKey, context)
    is PhomuException.InvalidTransition -> failure(code.toInt(), messageKey, context)
    is PhomuException.RoundNotComplete -> failure(code.toInt(), messageKey, context)
    is PhomuException.ModeNotEnabled -> failure(code.toInt(), messageKey, context)
    is PhomuException.CatalogueEmpty -> failure(code.toInt(), messageKey, context)
    is PhomuException.SongNotFound -> failure(code.toInt(), messageKey, context)
    is PhomuException.InvalidSongData -> failure(code.toInt(), messageKey, context)
    is PhomuException.PackNotFound -> failure(code.toInt(), messageKey, context)
    is PhomuException.DuplicateSongId -> failure(code.toInt(), messageKey, context)
    is PhomuException.MediaUnavailable -> failure(code.toInt(), messageKey, context)
    is PhomuException.MediaBlocked -> failure(code.toInt(), messageKey, context)
    is PhomuException.MediaFailed -> failure(code.toInt(), messageKey, context)
    is PhomuException.MediaTimedOut -> failure(code.toInt(), messageKey, context)
    is PhomuException.MediaProvidersExhausted -> failure(code.toInt(), messageKey, context)
    is PhomuException.Internal -> failure(code.toInt(), messageKey, context)
}

/**
 * The failure of the bridge, as the shell reads it.
 *
 * @param code the stable numeric code of the failure
 * @param messageKey the i18n key of the failure
 * @param context the context of the failure
 * @return the failure of the shell
 */
private fun failure(
    code: Int,
    messageKey: String,
    context: Map<String, String>,
): BridgeFailure = BridgeFailure(code = code, messageKey = messageKey, context = context)
