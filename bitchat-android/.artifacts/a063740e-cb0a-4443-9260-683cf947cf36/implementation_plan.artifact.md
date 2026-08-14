# Fix Build Failure: Missing Java 21 Toolchain

The build is failing because the project requires Java 21 (via `jvmToolchain(21)` in both `:app` and `:wear` modules), but no Java 21 installation is found on the machine, and no toolchain download repository is configured in Gradle.

## Proposed Changes

### Build Configuration

#### [MODIFY] [settings.gradle.kts](file:///home/mrinall-samal/Project-v2/SIH/bitchat-android/settings.gradle.kts)

Add the Foojay Toolchains Resolver plugin to allow Gradle to automatically download the required Java 21 toolchain.

```kotlin
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.9.0"
}
```

## Verification Plan

### Automated Tests
- Run `./gradlew :app:assembleDebug` to verify that the build succeeds and the toolchain is downloaded/configured correctly.
- Run `./gradlew :wear:assembleDebug` to verify the Wear module also builds.

### Manual Verification
- None required beyond successful build.
