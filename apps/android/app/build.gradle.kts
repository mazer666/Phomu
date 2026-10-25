// The application module of the Android shell.
//
// WHAT this file wires together: the Compose application, the generated
// UniFFI bindings of the base, the native library that carries the base, and
// the string resources that are generated from the locale files of the web
// shell.
//
// WHY the shell contains no rule of the game: every value that decides
// something about the game comes from the base through the bridge
// (docs/design/BUILD-CONTRACT.md § 2.4, rule B-6). This file therefore
// contains no constant of the game — only the wiring.

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

import org.gradle.process.ExecOperations
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import javax.inject.Inject
import java.util.Properties

abstract class GenerateStringsTask : DefaultTask() {

    /** The German locale file of the web shell — the default of the shell. */
    @get:InputFile
    abstract val germanLocale: RegularFileProperty

    /** The English locale file of the web shell. */
    @get:InputFile
    abstract val englishLocale: RegularFileProperty

    /** The generator that turns the locale files into Android resources. */
    @get:InputFile
    abstract val generator: RegularFileProperty

    /** The directory the resources are written into. */
    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty

    /** The directory the Kotlin projection of the key space is written into. */
    @get:OutputDirectory
    abstract val kotlinDirectory: DirectoryProperty

    /** The executor of the generator. */
    @get:Inject
    abstract val execOperations: ExecOperations

    @TaskAction
    fun generate() {
        val target = outputDirectory.get().asFile
        target.deleteRecursively()
        target.mkdirs()
        // WHY only the file is deleted and not the directory: the directory
        // carries the other generated sources as well, and a generator that
        // wipes the directory of a sibling generator destroys its output.
        val kotlinTarget = kotlinDirectory.get().asFile
            .resolve("de/phomu/config/GeneratedStrings.kt")
        kotlinTarget.parentFile.mkdirs()
        kotlinTarget.delete()
        execOperations.exec {
            commandLine(
                "node",
                generator.get().asFile.absolutePath,
                "--german", germanLocale.get().asFile.absolutePath,
                "--english", englishLocale.get().asFile.absolutePath,
                "--out", target.absolutePath,
                "--kotlin", kotlinTarget.absolutePath,
            )
        }
    }
}

/**
 * The task that builds the native library of the base for one Android ABI.
 *
 * WHY the build is driven by Gradle and not by a script: the artefact has to
 * be a declared input of the packaging task, otherwise a stale library would
 * silently travel into the APK.
 */
abstract class CargoLibraryTask : DefaultTask() {

    /** The Rust target triple of the ABI. */
    @get:Input
    abstract val targetTriple: Property<String>

    /** The prefix of the NDK compiler wrapper of the ABI. */
    @get:Input
    abstract val compilerPrefix: Property<String>

    /** The API level the compiler wrapper targets. */
    @get:Input
    abstract val apiLevel: Property<Int>

    /** The root of the NDK. */
    @get:InputDirectory
    abstract val ndkDirectory: DirectoryProperty

    /**
     * The root of the Cargo workspace.
     *
     * WHY it is not an input: the three tasks of the three ABIs write into
     * the same directory, and a shared input directory would make Gradle
     * report an implicit dependency between them. The output of the task is
     * the library, and that is what is tracked.
     */
    @get:Internal
    abstract val cargoWorkspace: DirectoryProperty

    /** The library the task produces. */
    @get:OutputFile
    abstract val outputFile: RegularFileProperty

    /** Whether the build is a release build. */
    @get:Input
    abstract val release: Property<Boolean>

    /** The executor of Cargo. */
    @get:Inject
    abstract val execOperations: ExecOperations

    @TaskAction
    fun build() {
        val triple = targetTriple.get()
        val ndk = ndkDirectory.get().asFile
        val toolchain = ndk.resolve("toolchains/llvm/prebuilt/linux-x86_64/bin")
        val linker = toolchain.resolve("${compilerPrefix.get()}${apiLevel.get()}-clang")
        if (!linker.isFile) {
            throw GradleException(
                "the NDK compiler wrapper $linker does not exist; " +
                    "the NDK in $ndk does not support the ABI of $triple",
            )
        }
        val environmentKey = triple.replace('-', '_').uppercase()
        execOperations.exec {
            workingDir = cargoWorkspace.get().asFile
            commandLine(
                "cargo", "build",
                "--package", "phomu-ffi",
                "--lib",
                "--target", triple,
                *(if (release.get()) arrayOf("--release") else emptyArray()),
            )
            environment("CARGO_TARGET_${environmentKey}_LINKER", linker.absolutePath)
            environment("CC_${triple}", linker.absolutePath)
            environment("AR_${triple}", toolchain.resolve("llvm-ar").absolutePath)
            environment("RANLIB_${triple}", toolchain.resolve("llvm-ranlib").absolutePath)
        }
    }
}

// ─── The paths of the repository ────────────────────────────────────────────

// WHY the paths are resolved from the location of the build file: the shell
// is a subproject of the repository and reaches the base, the locale files
// and the Cargo workspace through them.
val repositoryRoot: File = rootProject.projectDir.parentFile.parentFile
val cargoRoot: File = repositoryRoot
val localeDirectory: File = repositoryRoot.resolve("src/i18n/locales")
val bridgeBindings: File = repositoryRoot.resolve("platform/phomu-ffi/bindings/kotlin")

// ─── The Android configuration ─────────────────────────────────────────────

android {
    namespace = "de.phomu"
    compileSdk = libs.versions.compileSdk.get().toInt()

    // WHY the version is pinned: the compiler wrappers of the NDK belong to
    // the version, and a build that silently uses another NDK produces a
    // library that is not the library the build was tested with. The value
    // is the revision of NDK r27c.
    ndkVersion = "27.3.13750724"

    defaultConfig {
        applicationId = "de.phomu"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.targetSdk.get().toInt()
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // WHY the signing is not configured here: a release build of the
            // shell is signed by the release pipeline with a key that never
            // lives in the repository. `assembleRelease` therefore produces
            // an unsigned artefact, which is the correct intermediate state.
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += setOf(
                "/META-INF/{AL2.0,LGPL2.1}",
                "/META-INF/DEPENDENCIES",
                "/META-INF/LICENSE*",
                "/META-INF/NOTICE*",
            )
        }
    }

    testOptions {
        unitTests {
            // WHY the resources are included: the tests read the generated
            // string resources and compare them with the locale files of the
            // web shell (SHELL-110).
            isIncludeAndroidResources = true
            isReturnDefaultValues = true
        }
    }

    lint {
        // WHY the lint does not fail the build yet: the shell is new and the
        // findings of the first run are the backlog of the track. The report
        // is written and read; the gate comes with the acceptance.
        warningsAsErrors = false
        abortOnError = false
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

// ─── The generated bindings of the base ─────────────────────────────────────

// WHY the bindings come from the repository and are not copied into the
// module: the generated Kotlin bindings are a *generated artefact* of the
// bridge. There is exactly one of them in the repository, every shell reads
// it, and it is never edited by hand (docs/design/BUILD-CONTRACT.md § 2.4,
// rule B-6). `scripts/generate-bindings.sh` regenerates it in place.
//
// WHY the check below: a binding that is older than the exported surface
// compiles and fails at run time. The task compares the functions the bridge
// declares with the functions the bindings contain and fails the build when
// one is missing.
val verifyBridgeSurface by tasks.registering {
    group = "verification"
    description = "Checks that the generated Kotlin bindings cover the exported surface."

    val surfaceFile = repositoryRoot.resolve("platform/phomu-ffi/src/surface.rs")
    val bindingFile = bridgeBindings.resolve("org/phomu/bridge/phomu_ffi.kt")
    inputs.file(surfaceFile)
    inputs.file(bindingFile)
    outputs.upToDateWhen { false }

    doLast {
        val surface = surfaceFile.readText()
        val bindings = bindingFile.readText()
        val block = surface.substringAfter("EXPORTED_FUNCTIONS").substringBefore("];")
        val functions = Regex("\"([a-z0-9_]+)\"").findAll(block)
            .map { it.groupValues[1] }
            .toList()
        require(functions.isNotEmpty()) { "no exported function found in $surfaceFile" }
        val missing = functions.filter { function ->
            val parts = function.split('_')
            val camel = parts.first() + parts.drop(1).joinToString("") { part ->
                part.replaceFirstChar { it.uppercase() }
            }
            !bindings.contains("fun `$camel`")
        }
        if (missing.isNotEmpty()) {
            throw GradleException(
                "the generated Kotlin bindings do not cover the exported surface; " +
                    "missing: ${missing.joinToString(", ")}. " +
                    "Run apps/android/scripts/generate-bindings.sh.",
            )
        }
        logger.lifecycle("bridge surface verified: ${functions.size} exported functions covered")
    }
}

// The bindings are compiled into the application. They are generated code
// that lives in the repository, therefore the module reads them as an
// additional source directory instead of copying them.
android.sourceSets.getByName("main").kotlin.srcDir(bridgeBindings)

// ─── The catalogue asset of the shell ───────────────────────────────────────

// WHY the catalogue is an asset and not a download: a fresh installation has
// to reach the lobby and start a round without a network
// (docs/spec/REQUIREMENTS-PLATFORM.md, SHELL-116). The artefact is built by
// the toolchain of the base, so that every shell consumes the same one
// (SHELL-115).
val generatedAssetsDirectory: File = layout.buildDirectory.dir("generated/assets").get().asFile
generatedAssetsDirectory.mkdirs()

val buildCatalogueAsset by tasks.registering(Exec::class) {
    group = "build"
    description = "Builds the catalogue asset of the shell from the catalogue of the base."
    commandLine(
        rootProject.projectDir.resolve("scripts/build-catalogue-asset.sh").absolutePath,
        generatedAssetsDirectory.absolutePath,
    )
}

android.sourceSets.getByName("main").assets.srcDir(generatedAssetsDirectory)

// ─── The native library of the base ─────────────────────────────────────────

// WHY the ABIs are these three: `arm64-v8a` is every current Android phone,
// `armeabi-v7a` is the 32-bit fallback and `x86_64` is the emulator the
// track tests on. The NDK of the sandbox builds all three.
val rustAbis = mapOf(
    "arm64-v8a" to Pair("aarch64-linux-android", "aarch64-linux-android"),
    "armeabi-v7a" to Pair("armv7-linux-androideabi", "armv7a-linux-androideabi"),
    "x86_64" to Pair("x86_64-linux-android", "x86_64-linux-android"),
)

// WHY the NDK is looked up in three places: the sandbox exports
// `ANDROID_NDK_HOME`, a developer has it in `local.properties`, and the
// Android SDK manager installs it below the SDK root.
val localProperties: Properties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.isFile) {
        file.inputStream().use { stream -> this@apply.load(stream) }
    }
}

val ndkRoot: File = sequenceOf(
    localProperties.getProperty("ndk.dir"),
    System.getenv("ANDROID_NDK_HOME"),
    System.getenv("ANDROID_NDK_ROOT"),
    localProperties.getProperty("sdk.dir")?.let { File(it, "ndk").absolutePath },
).filterNotNull().map { File(it) }
    .firstOrNull { File(it, "source.properties").isFile }
    ?: File("/workspace/toolchain/android-ndk")

val rustLibraryDirectory: File = layout.buildDirectory.dir("rust/jniLibs").get().asFile
rustLibraryDirectory.mkdirs()

val rustReleaseBuild: Boolean = project.hasProperty("phomuRustRelease")

val rustCargoTasks = mutableListOf<TaskProvider<CargoLibraryTask>>()

val rustCopyTasks = rustAbis.map { (abi, triple) ->
    val (targetTriple, compilerPrefix) = triple
    val cargoTask = tasks.register<CargoLibraryTask>("cargoLibrary${abi.replace('-', '_')}") {
        group = "native"
        description = "Builds the native library of the base for $abi."
        this.targetTriple.set(targetTriple)
        this.compilerPrefix.set(compilerPrefix)
        this.apiLevel.set(libs.versions.minSdk.get().toInt())
        this.ndkDirectory.set(ndkRoot)
        this.cargoWorkspace.set(cargoRoot)
        this.release.set(rustReleaseBuild)
        this.outputFile.set(
            cargoRoot.resolve(
                "target/$targetTriple/" +
                    (if (rustReleaseBuild) "release" else "debug") +
                    "/libphomu_ffi.so",
            ),
        )
    }
    rustCargoTasks.add(cargoTask)
    tasks.register<Copy>("copyRustLibrary${abi.replace('-', '_')}") {
        group = "native"
        description = "Copies the native library of the base for $abi into the application."
        dependsOn(cargoTask)
        from(cargoTask.map { it.outputFile })
        into(rustLibraryDirectory.resolve(abi))
    }
}

// WHY the serialisation: the three builds of the three ABIs share the
// target directory of the Cargo workspace, and two Cargo processes in the
// same directory block each other. The machine of the track has two cores
// and three gigabytes of memory — a parallel build of three libraries would
// exhaust it.
rustCargoTasks.forEachIndexed { index, task ->
    rustCargoTasks.drop(index + 1).forEach { next -> next.configure { mustRunAfter(task) } }
}

android.sourceSets.getByName("main").jniLibs.srcDir(rustLibraryDirectory)

// WHY the check below: the native library of the base is the only place where
// the rules of the game exist on the device. An application without it starts
// and then fails at the first call, which is the worst moment to find out.
val checkRustLibrary by tasks.registering {
    group = "verification"
    description = "Checks that the native library of the base is packaged for every ABI."
    dependsOn(rustCopyTasks)
    val directory = rustLibraryDirectory
    inputs.dir(directory)
    outputs.upToDateWhen { false }
    doLast {
        val missing = rustAbis.keys.filter { abi ->
            !File(directory, "$abi/libphomu_ffi.so").isFile
        }
        if (missing.isNotEmpty()) {
            throw GradleException(
                "the native library of the base is missing for: ${missing.joinToString(", ")}",
            )
        }
        logger.lifecycle("native library present for: ${rustAbis.keys.joinToString(", ")}")
    }
}

tasks.named("preBuild").configure {
    dependsOn(rustCopyTasks)
    dependsOn(verifyBridgeSurface)
    dependsOn(buildCatalogueAsset)
}

// ─── The string resources of the shell ──────────────────────────────────────

// WHY the resources and the projection of the key space are generated: the
// texts of the product live in `src/i18n/locales/*.json` of the repository.
// A second, hand-maintained translation table in the shell would be a second
// truth, and the requirement SHELL-110 demands the same key set in every
// shell.
val generatedKotlinDirectory: File = layout.buildDirectory.dir("generated/kotlin/phomu").get().asFile
generatedKotlinDirectory.mkdirs()

val generateStrings by tasks.registering(GenerateStringsTask::class) {
    group = "build"
    description = "Generates the string resources of the shell from the locale files of the web shell."
    germanLocale.set(localeDirectory.resolve("de.json"))
    englishLocale.set(localeDirectory.resolve("en.json"))
    generator.set(rootProject.projectDir.resolve("scripts/generate-strings.mjs"))
    outputDirectory.set(layout.buildDirectory.dir("generated/res/phomu"))
    kotlinDirectory.set(generatedKotlinDirectory)
}

// WHY the projection of the configuration is generated: rule K-2 of the
// build contract says that no shell defines a game constant, and rule K-3
// allows a shell to hold a generated projection of the configuration.
val generateConfigProjection by tasks.registering(Exec::class) {
    group = "build"
    description = "Generates the projection of the game constants for the shell."
    outputs.file(
        generatedKotlinDirectory.resolve("de/phomu/config/GeneratedGameConfig.kt"),
    )
    commandLine(
        "node",
        rootProject.projectDir.resolve("scripts/generate-config-projection.mjs").absolutePath,
        "--out", generatedKotlinDirectory.resolve("de/phomu/config/GeneratedGameConfig.kt").absolutePath,
    )
}

android.sourceSets.getByName("main").kotlin.srcDir(generatedKotlinDirectory)

androidComponents {
    onVariants { variant ->
        variant.sources.res?.addGeneratedSourceDirectory(generateStrings) { task ->
            (task as GenerateStringsTask).outputDirectory
        }
    }
}

// WHY the Kotlin compilation depends on the generators: the generated
// sources are part of the compilation, therefore they have to exist before
// the compiler runs.
tasks.matching { it.name.startsWith("compile") && it.name.endsWith("Kotlin") }
    .configureEach {
        dependsOn(generateStrings, generateConfigProjection)
    }

// ─── The dependencies ───────────────────────────────────────────────────────

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.kotlinx.coroutines.android)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // The Java Native Access library: the AAR carries the native dispatcher
    // for the Android ABIs, the plain JAR carries it for the JVM tests.
    implementation(libs.jna.android)
    testImplementation(libs.jna.desktop)

    testImplementation(libs.junit)
    testImplementation(libs.gson)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(libs.androidx.test.core.ktx)

    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.core.ktx)
}

// WHY the host build of the base is a test dependency: the JVM test of the
// bridge plays a round through the *real* library. The library is built for
// the host and put on the library path of the test JVM.
val cargoHostLibrary by tasks.registering(Exec::class) {
    group = "native"
    description = "Builds the native library of the base for the host, for the JVM tests."
    workingDir = cargoRoot
    commandLine("cargo", "build", "--package", "phomu-ffi", "--lib")
}

tasks.withType<Test>().configureEach {
    dependsOn(cargoHostLibrary)
    // WHY the property: JNA looks for the native library in the paths of the
    // `jna.library.path` system property. The test therefore loads the very
    // library that the Cargo workspace produced.
    systemProperty(
        "jna.library.path",
        cargoRoot.resolve("target/debug").absolutePath,
    )
    systemProperty("phomu.repository.root", repositoryRoot.absolutePath)
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = false
    }
}
