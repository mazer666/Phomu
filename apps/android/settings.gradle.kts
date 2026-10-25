// The settings of the Android shell.
//
// WHY the repository declaration is strict: a module that declares its own
// repository would bypass the version catalogue and the review of it
// (docs/design/PLATFORM-ARCHITECTURE.md § 13.4).

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "phomu-android"

// The application module of the shell.
include(":app")
