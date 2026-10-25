package de.phomu.platform

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import java.io.IOException

/**
 * The player of the preview audio of a provider.
 *
 * WHAT: the player of a `preview-audio` source of the media plan of the
 * base.
 *
 * WHY the shell plays the audio and the base decides what is played: the
 * base owns the provider order, the fallback chain and the offsets; the
 * shell owns the player surface (docs/design/PLATFORM-ARCHITECTURE.md § 8.3).
 *
 * WHY only one player exists: the music of one provider must not keep
 * playing when the music of another starts. A new playback therefore stops
 * the previous one before it begins.
 */
class MusicPlayer(private val focus: AudioFocusController) {

    /** The player of the platform, while a source is playing. */
    private var player: MediaPlayer? = null

    /** The attributes of the music: it is music and it interrupts other music. */
    private val attributes: AudioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build()

    /**
     * The result of a playback.
     *
     * WHY the shell names the results: the base classifies the failures of a
     * provider; the shell reports what the platform did
     * (docs/design/PLATFORM-ARCHITECTURE.md § 8.8).
     */
    enum class Outcome {
        /** The source plays. */
        Played,

        /** The source cannot be reached. */
        Unavailable,

        /** The system refused the playback. */
        Blocked,

        /** The playback failed. */
        Failed,
    }

    /**
     * Plays a source.
     *
     * @param location the location of the audio file
     * @param startSeconds the offset the playback starts at
     * @return the result of the playback
     */
    fun play(location: String, startSeconds: Int): Outcome {
        stop()
        if (!focus.request()) {
            return Outcome.Blocked
        }
        val created = MediaPlayer()
        return try {
            created.setAudioAttributes(attributes)
            created.setDataSource(location)
            created.prepare()
            if (startSeconds > 0) {
                created.seekTo(startSeconds * 1000)
            }
            created.setOnCompletionListener { stop() }
            created.start()
            player = created
            Outcome.Played
        } catch (failure: IOException) {
            created.release()
            Outcome.Unavailable
        } catch (failure: IllegalStateException) {
            created.release()
            Outcome.Failed
        } catch (failure: IllegalArgumentException) {
            created.release()
            Outcome.Failed
        }
    }

    /**
     * Stops the playback and gives the audio focus back.
     */
    fun stop() {
        val current = player ?: return
        player = null
        try {
            current.stop()
        } catch (failure: IllegalStateException) {
            // The player was not playing; the release below is enough.
        }
        current.release()
        focus.abandon()
    }

    /**
     * Whether a source is playing.
     *
     * @return `true` when a source is playing
     */
    fun isPlaying(): Boolean = player?.isPlaying == true

    /**
     * The location of a source, as the platform understands it.
     *
     * @param location the location of the source
     * @return the location for the platform
     */
    fun toUri(location: String): Uri = Uri.parse(location)
}
