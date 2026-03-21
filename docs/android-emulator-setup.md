# Android Emulator Setup

## Prerequisites

- Android SDK installed (via Android Studio) at `~/Library/Android/sdk`

## Add Android tools to PATH

Add the following to `~/.zshrc`:

```bash
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

Then reload your shell:

```bash
source ~/.zshrc
```

Verify with:

```bash
adb --version
```

## List available emulators

```bash
emulator -list-avds
```

## Start the emulator

```bash
emulator -avd Pixel_6_Pro_API_34
```

Run this in a separate terminal — it stays running while the emulator is active.

## Verify the emulator is connected

```bash
adb devices
```

You should see output like:

```
List of devices attached
emulator-5554   device
```

## Run the field-app on the emulator

From the workspace root:

```bash
export ANDROID_HOME=~/Library/Android/sdk
npm exec nx run field-app:run-android
```

Or manually:

```bash
cd apps/field-app/android && ./gradlew installDebug
```

Then start the Metro bundler in a separate terminal:

```bash
npm exec nx start field-app
```
