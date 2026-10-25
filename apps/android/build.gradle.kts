// The build of the Android shell.
//
// WHY the plugins are declared here and not applied here: the root project
// only carries the versions; the module applies them. That keeps the
// configuration of the module readable and the root free of logic.

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
