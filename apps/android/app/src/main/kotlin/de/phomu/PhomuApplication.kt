package de.phomu

import android.app.Application

/**
 * The application of the shell.
 *
 * WHY the container lives here: the dependencies of the shell have to exist
 * before the first activity is created, and the application is the only
 * object that lives that long.
 */
class PhomuApplication : Application() {

    /** The dependencies of the shell. */
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
