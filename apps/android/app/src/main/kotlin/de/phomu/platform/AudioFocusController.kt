package de.phomu.platform

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build

/**
 * The audio focus of the application.
 *
 * WHAT: the request of the audio focus for the music of a round, and the
 * answer of the system when another application wants the focus.
 *
 * WHY the shell asks for the focus: the music of one provider must not keep
 * playing when the music of another starts, and the music of another
 * application must not drown the music of the round
 * (docs/design/PLATFORM-ARCHITECTURE.md § 8.3).
 *
 * WHY the attributes say "music" and `USAGE_MEDIA`: the attributes tell the
 * system what the sound is and what it is allowed to interrupt. A game
 * sound is music, and music interrupts other music — not a notification and
 * not an alarm.
 */
class AudioFocusController(context: Context) {

    /** The manager of the audio system. */
    private val audioManager: AudioManager =
        context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    /** The attributes of the music of a round. */
    private val musicAttributes: AudioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build()

    /** The request of the focus, on the platforms that know it. */
    private val focusRequest: AudioFocusRequest? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(musicAttributes)
            .setOnAudioFocusChangeListener { change -> onFocusChanged(change) }
            .build()
    } else {
        null
    }

    /** The listener of the focus on the platforms without a request object. */
    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        onFocusChanged(change)
    }

    /** What has to happen when the focus changes. */
    var onFocusLost: (() -> Unit)? = null

    /** What has to happen when the focus comes back. */
    var onFocusGained: (() -> Unit)? = null

    /**
     * Asks for the audio focus.
     *
     * @return `true` when the focus was granted
     */
    fun request(): Boolean {
        val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val request = focusRequest ?: return false
            audioManager.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                focusListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN,
            )
        }
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    /**
     * Gives the audio focus back.
     */
    fun abandon() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val request = focusRequest ?: return
            audioManager.abandonAudioFocusRequest(request)
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(focusListener)
        }
    }

    /**
     * The reaction to a change of the focus.
     *
     * @param change the change the system reports
     */
    private fun onFocusChanged(change: Int) {
        when (change) {
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            -> onFocusLost?.invoke()

            AudioManager.AUDIOFOCUS_GAIN -> onFocusGained?.invoke()
            else -> Unit
        }
    }
}
