# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Running the Project

### iOS Simulator

To run the app in iOS Simulator:

1. Make sure you have Xcode installed
   ```bash
   xcode-select --install
   ```

2. Install CocoaPods if you haven't already
   ```bash
   sudo gem install cocoapods
   ```

3. Install dependencies and pods
   ```bash
   npm install
   cd ios && pod install && cd ..
   ```

4. Start the app in iOS Simulator
   ```bash
   npm run ios
   ```

> **Note:** Some features like NFC and camera will not be available in the simulator.

### Connected iPhone Device

To run the app on a physical iPhone:

1. Open the project in Xcode
   ```bash
   cd ios
   open mist2.xcworkspace
   ```

2. Connect your iPhone to your Mac using a USB cable

3. In Xcode:
   - Select your device from the device dropdown in the top toolbar
   - Ensure your Apple ID is set up in Xcode → Preferences → Accounts
   - Select the appropriate Team in the "Signing & Capabilities" tab
   - Click the Play button to build and run on your device

> **Note:** The first time you run on a physical device, you'll need to trust the developer certificate on your iPhone (Settings → General → Device Management).

### Android Simulator

To run the app in Android Simulator:

1. Install Android Studio from [developer.android.com](https://developer.android.com/studio)

2. Open Android Studio and set up an Android Virtual Device (AVD):
   - Click on "More Actions" → "Virtual Device Manager"
   - Click "Create Device" and follow the instructions to create a device with Google Play Services

3. Start the Android emulator from the AVD Manager

4. Run the app on the emulator
   ```bash
   npm run android
   ```

> **Note:** Some features like NFC and camera will not be available in the simulator.

## Android Development on macOS with Physical Device

To develop this app on a physical Android device connected to macOS:

1. Install Java Development Kit (JDK)
   ```bash
   brew install openjdk@17
   ```

2. Create a system-wide symlink to Java (requires admin privileges)
   ```bash
   sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
   ```

3. Verify Java installation
   ```bash
   java -version
   ```

4. Enable Developer Options on Android device
   - Go to Settings > About phone
   - Tap on Build number 7 times
   - Enable USB debugging in the new Developer options menu

5. Connect Android device and verify connection
   ```bash
   adb devices
   ```

6. Start the development server
   ```bash
   npx expo start --dev-client
   ```

7. Build and install on connected device
   ```bash
   npx expo run:android --device
   ```

After the initial setup, for daily development you only need to:
1. Connect your device via USB
2. Run `npx expo start --dev-client`
3. Launch the installed app on your device

### Android Release Build on Physical Device

To run the app as a production build on your Android phone:

1. Create local.properties file (if not already present)
   ```bash
   echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
   ```

2. Build a release APK
   ```bash
   cd android && ./gradlew assembleRelease
   ```

3. Make sure ADB is in your PATH
   ```bash
   # For one-time use
   export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools/
   
   # Or add permanently to your shell profile
   echo 'export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools/' >> ~/.zshrc
   source ~/.zshrc
   ```

4. Install the release build on your connected device
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

   Alternatively, you can build and install in one step:
   ```bash
   cd android && ./gradlew installRelease
   ```

> **Note:** Production builds disable development features like hot reloading and developer menus, providing a more realistic end-user experience.

## Troubleshooting

### iOS Build Issues

If you encounter issues building for iOS:

1. Clean the project:
   ```bash
   cd ios
   rm -rf build
   pod install
   cd ..
   ```

2. Reset Metro cache:
   ```bash
   npm start -- --reset-cache
   ```

3. If you have pod dependency conflicts, try:
   ```bash
   cd ios
   pod deintegrate
   pod setup
   pod install
   cd ..
   ```

### Android Build Issues

If you encounter issues building for Android:

1. Clean Gradle build:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. Check for and update SDK tools in Android Studio's SDK Manager

3. Make sure your environment variables are properly set in your .bash_profile or .zshrc:
   ```
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

## Change the icon

   ```bash
   cp ./mist2_logo.png ./assets/images/icon.png && cp ./mist2_logo.png ./assets/images/adaptive-icon.png && cp ./mist2_logo.png ./assets/images/splash-icon.png
   npx expo prebuild --clean
   ```