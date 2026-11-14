# 🔦 Morse Flasher Pro — Built for Voyager's Light-Day 🛰️

A mobile application built with **React Native (Expo)** that converts text into International Morse Code and transmits it using your smartphone's rear LED flashlight and synchronized 700Hz audio tones.

## 🚀 Why I Built This
I created this project to participate in NASA's **"Shine Bright for Voyager's Light-Day"** global celebration on **Tuesday, November 17, 2026**—marking the historic milestone of **Voyager 1** reaching **one light-day away from Earth**, a distance never before reached by any human-made object.

After sunset on Nov. 17, anyone with this app can point their phone skyward and automatically transmit Voyager's three-letter call sign (**`VGR`**) in Morse code:
- **V:** `...-` *(dot-dot-dot-dash)*
- **G:** `--.` *(dash-dash-dot)*
- **R:** `.-.` *(dot-dash-dot)*

## ✨ Features
- **Real-Time Morse Translation:** Instantly converts alphanumeric text into dots (`.`) and dashes (`-`) with a live visual preview.
- **Automated Hardware Flashlight Transmission:** Pulses your phone's rear camera LED using standard International Morse timing ratios (`1 unit` dot, `3 units` dash, `1 unit` intra-character gap, `3 units` letter gap, `7 units` word gap).
- **Adjustable Transmission Speed:** Switch between **Slow** (`350ms`), **Normal** (`200ms`), and **Fast** (`100ms`) base unit speeds on the fly.
- **Synchronized 700Hz Audio Tone:** Generates an in-memory sine-wave beep synced with every light pulse (toggleable).
- **Continuous Loop Mode:** Automatically repeats your signal (like `VGR` or `SOS`) until manually stopped.
- **Visual Signal Indicator:** On-screen status banner flashes alongside the hardware LED.

## 📲 Download & Install (Android APK)
Want to join the celebration with your Android phone?
1. Download the APK: [Download Morse Flasher Pro (.apk)](https://expo.dev/artifacts/eas/rAWMtu5CohTECkx5vUQCeaAcTkLrt_cQVJZd-1ENMl8.apk)
2. Open the downloaded `.apk` file on your Android device.
3. If prompted, allow **Install from unknown sources** in your device settings and tap **Install**.
4. Grant **Camera** permission when launching the app (required by Android to control the hardware flashlight).
5. Type **`VGR`**, enable **Continuous Loop** if desired, point your phone skyward after sunset on Nov. 17, and tap **Transmit Flash**!

## 🛠️ Run Locally (Development)
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/kaveensavindu52-ops/MorseFlasher.git](https://github.com/kaveensavindu52-ops/MorseFlasher.git)
   cd MorseFlasher