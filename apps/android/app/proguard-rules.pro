# The rules of the shrinker of the release build.
#
# WHY the rules exist: the generated UniFFI bindings call the Java Native
# Access library by name. The shrinker renames the classes and the methods
# it does not know about, and the native library then cannot find them.
#
# WHY the whole JNA package is kept: JNA resolves the native functions by
# name at run time, so every class and every method of the library has to
# survive the shrinker.

-keep class com.sun.jna.** { *; }
-keep class com.sun.jna.platform.** { *; }
-keepclassmembers class * {
    @com.sun.jna.* <fields>;
    @com.sun.jna.* <methods>;
}
-keep class org.phomu.bridge.** { *; }

# WHY the annotations of the bindings are kept: UniFFI reads the metadata of
# the records through them.
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions
