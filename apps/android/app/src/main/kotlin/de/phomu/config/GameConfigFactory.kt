package de.phomu.config

import de.phomu.bridge.BridgeVocabulary
import org.phomu.bridge.PhomuGameConfig

/**
 * The configuration of a session, as the shell sends it to the base.
 *
 * WHY the factory exists: the shell must not invent the values of a session.
 * Every number comes from the generated projection of the constants of the
 * base, every identifier comes from the vocabulary of the wire, and every
 * decision the player makes comes from the lobby. The factory is the one
 * place where the three meet.
 */
object GameConfigFactory {

    /**
     * The configuration of a session.
     *
     * @param selectedModes the identifiers of the modes that are played
     * @param selectedPacks the identifiers of the packs that are drawn from
     * @param teamMode how the players are grouped
     * @param endingCondition what ends the game
     * @param targetPoints the score that ends the game
     * @param targetRounds the number of rounds that ends the game
     * @param targetTimeMinutes the number of minutes that ends the game
     * @param difficulty the difficulty the songs have to have
     * @param preferredMusicProvider the provider the players prefer
     * @return the configuration
     */
    fun create(
        selectedModes: List<String>,
        selectedPacks: List<String>,
        teamMode: String = GeneratedGameConfig.DEFAULT_TEAM_MODE,
        endingCondition: String = BridgeVocabulary.ENDING_CONDITION_POINTS,
        targetPoints: Long = GeneratedGameConfig.DEFAULT_TARGET_POINTS.toLong(),
        targetRounds: Int = GeneratedGameConfig.DEFAULT_ROUNDS_TO_PLAY,
        targetTimeMinutes: Int = GeneratedGameConfig.DEFAULT_TARGET_TIME_MINUTES,
        difficulty: String = BridgeVocabulary.DIFFICULTY_ALL,
        preferredMusicProvider: String = GeneratedGameConfig.DEFAULT_MUSIC_PROVIDER,
    ): PhomuGameConfig = PhomuGameConfig(
        selectedModes = selectedModes,
        selectedPacks = selectedPacks,
        teamMode = teamMode,
        deviceMode = BridgeVocabulary.DEVICE_MODE_PASS_THE_PHONE,
        endingCondition = endingCondition,
        targetPoints = targetPoints,
        targetRounds = targetRounds.toUInt(),
        targetTimeMinutes = targetTimeMinutes.toUInt(),
        timeLimitSeconds = null,
        difficulty = difficulty,
        timelineMaxPoints = GeneratedGameConfig.DEFAULT_TIMELINE_MAX_POINTS.toUInt(),
        timeDecayEnabled = GeneratedGameConfig.DEFAULT_TIME_DECAY_ENABLED,
        timeDecayGraceSeconds = GeneratedGameConfig.DEFAULT_TIME_DECAY_GRACE_SECONDS.toUInt(),
        timeDecayStepSeconds = GeneratedGameConfig.DEFAULT_TIME_DECAY_STEP_SECONDS.toUInt(),
        timeDecayStepPoints = GeneratedGameConfig.DEFAULT_TIME_DECAY_STEP_POINTS.toUInt(),
        minPointsPerCorrect = GeneratedGameConfig.DEFAULT_MIN_POINTS_PER_CORRECT.toUInt(),
        overrideGovernance = GeneratedGameConfig.DEFAULT_OVERRIDE_GOVERNANCE,
        hintReleasePolicy = GeneratedGameConfig.DEFAULT_HINT_RELEASE_POLICY,
        aiQueueStrategy = BridgeVocabulary.AI_QUEUE_STRATEGY_QUEUE_RETRY,
        chipsEnabled = GeneratedGameConfig.ENABLE_CHIPS_BETTING,
        noCheatMode = GeneratedGameConfig.DEFAULT_NO_CHEAT_MODE,
        onlyQrCompatible = false,
        eliminationRule = BridgeVocabulary.ELIMINATION_RULE_NONE,
        preferredMusicProvider = preferredMusicProvider,
    )
}
