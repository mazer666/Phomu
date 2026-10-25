package de.phomu.bridge

import org.phomu.bridge.PhomuAnswer
import org.phomu.bridge.PhomuCatalogHandle
import org.phomu.bridge.PhomuGameConfig
import org.phomu.bridge.PhomuGameOverSnapshot
import org.phomu.bridge.PhomuMediaPlan
import org.phomu.bridge.PhomuPackInfo
import org.phomu.bridge.PhomuPlayer
import org.phomu.bridge.PhomuRevealView
import org.phomu.bridge.PhomuRoundView
import org.phomu.bridge.PhomuScoreSnapshot
import org.phomu.bridge.PhomuSessionHandle
import org.phomu.bridge.PhomuSessionSnapshot
import org.phomu.bridge.PhomuSongSummary
import org.phomu.bridge.PhomuTeam
import org.phomu.bridge.phomuAbiAccepts
import org.phomu.bridge.phomuAbiVersion
import org.phomu.bridge.phomuCatalogOpen
import org.phomu.bridge.phomuCatalogPacks
import org.phomu.bridge.phomuCatalogSongs
import org.phomu.bridge.phomuMediaPlan
import org.phomu.bridge.phomuMessageKey
import org.phomu.bridge.phomuSessionAnswer
import org.phomu.bridge.phomuSessionDraw
import org.phomu.bridge.phomuSessionEnd
import org.phomu.bridge.phomuSessionNew
import org.phomu.bridge.phomuSessionNextRound
import org.phomu.bridge.phomuSessionReveal
import org.phomu.bridge.phomuSessionSnapshot
import org.phomu.bridge.phomuSessionStart

/**
 * The bridge of the base, as the generated UniFFI bindings.
 *
 * WHAT: the implementation of [GameBridge] that calls the generated
 * bindings of `platform/phomu-ffi`.
 *
 * WHY the shell adds nothing here: the generated bindings already carry the
 * marshalling. This class only converts the unsigned integers of the
 * bindings into the signed ones of the shell and maps the failure of the
 * bridge onto the failure of the shell.
 *
 * EXAMPLE: `UniFfiGameBridge().abiVersion()` returns the version the base
 * reports, for example `1.0.0`.
 */
class UniFfiGameBridge : GameBridge {

    override fun abiVersion(): String = phomuAbiVersion()

    override fun abiAccepts(
        minimum: Triple<Int, Int, Int>,
        maximum: Triple<Int, Int, Int>,
    ): Boolean = phomuAbiAccepts(
        minimum.first.toUShort(),
        minimum.second.toUShort(),
        minimum.third.toUShort(),
        maximum.first.toUShort(),
        maximum.second.toUShort(),
        maximum.third.toUShort(),
    )

    override fun openCatalogue(source: String): PhomuCatalogHandle =
        phomuCatalogOpen(source)

    override fun cataloguePacks(handle: PhomuCatalogHandle): List<PhomuPackInfo> =
        phomuCatalogPacks(handle)

    override fun catalogueSongs(
        handle: PhomuCatalogHandle,
        packs: List<String>,
    ): List<PhomuSongSummary> = phomuCatalogSongs(handle, packs)

    override fun newSession(
        config: PhomuGameConfig,
        players: List<PhomuPlayer>,
        teams: List<PhomuTeam>,
        catalogue: PhomuCatalogHandle?,
        seed: Long,
        nowMs: Long,
    ): PhomuSessionHandle = phomuSessionNew(
        config,
        players,
        teams,
        catalogue,
        seed.toULong(),
        nowMs.toULong(),
    )

    override fun snapshot(handle: PhomuSessionHandle): PhomuSessionSnapshot =
        phomuSessionSnapshot(handle)

    override fun start(handle: PhomuSessionHandle, nowMs: Long): PhomuRoundView =
        phomuSessionStart(handle, nowMs.toULong())

    override fun draw(
        handle: PhomuSessionHandle,
        source: String,
        song: String?,
    ): PhomuRoundView = phomuSessionDraw(handle, source, song)

    override fun answer(
        handle: PhomuSessionHandle,
        answer: PhomuAnswer,
        answeredInSeconds: Int?,
    ): PhomuScoreSnapshot = phomuSessionAnswer(
        handle,
        answer,
        answeredInSeconds?.toUInt(),
    )

    override fun reveal(handle: PhomuSessionHandle): PhomuRevealView =
        phomuSessionReveal(handle)

    override fun nextRound(handle: PhomuSessionHandle, nowMs: Long): PhomuRoundView =
        phomuSessionNextRound(handle, nowMs.toULong())

    override fun end(handle: PhomuSessionHandle, winnerId: String?): PhomuGameOverSnapshot =
        phomuSessionEnd(handle, winnerId)

    override fun mediaPlan(handle: PhomuSessionHandle): PhomuMediaPlan =
        phomuMediaPlan(handle)

    override fun messageKey(event: String): String = phomuMessageKey(event)
}

/**
 * The bracket of base versions the shell accepts.
 *
 * WHY the bracket is "every 1.x": the shell is released independently of the
 * base, and a shell must fail *closed* — at start-up, not in the middle of a
 * round (docs/design/BUILD-CONTRACT.md § 3.2). The bracket is raised
 * together with the shell when a major version of the surface is removed.
 */
object AbiBracket {

    /** The lowest version of the surface the shell accepts. */
    val MINIMUM: Triple<Int, Int, Int> = Triple(1, 0, 0)

    /** The highest version of the surface the shell accepts. */
    val MAXIMUM: Triple<Int, Int, Int> = Triple(1, 99, 0)

    /**
     * Whether the base may be used.
     *
     * @param bridge the bridge of the base
     * @return `true` when the version of the base lies inside the bracket
     */
    fun accepts(bridge: GameBridge): Boolean = bridge.abiAccepts(MINIMUM, MAXIMUM)
}
