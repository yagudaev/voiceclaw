---
layout: default
title: Mobile App
nav_order: 5
---

# Mobile App

The mobile app is a React Native application built with Expo, designed as an iOS voice assistant. It connects to the relay server over WebSocket and provides a native voice conversation experience.

## Features

- **Voice conversations** -- real-time voice I/O using the system audio route
- **Conversation history** -- local SQLite storage with searchable transcripts
- **Conversation continuity** -- prior messages injected as context when resuming
- **Tab navigation** -- Chat, History, and Settings
- **Brain agent integration** -- tool progress displayed in the UI
- **Barge-in support** -- interrupt the AI mid-response by speaking

## Tech Stack

- **Expo** 55 -- build and development framework
- **React Native** 0.83 -- cross-platform UI
- **Expo Router** -- file-based routing
- **NativeWind** 4 (Tailwind CSS) -- styling
- **expo-sqlite** -- local conversation storage
- **React Native Reanimated** 4 -- animations
- **lucide-react-native** -- icons
- **react-native-sse** -- server-sent events support

## Getting Started

```bash
cd mobile
yarn install
yarn dev          # start Expo dev server (clears cache)
```

### Running on Simulator

```bash
yarn ios          # launch in iOS simulator (development variant)
```

### Running on Device

```bash
yarn ios:device   # build and run on connected iOS device (development variant)
```

### Release Build

```bash
yarn ios:release  # build release configuration on device
```

## Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Start Expo dev server with cache clear |
| `yarn ios` | Run on iOS simulator (development build) |
| `yarn ios:device` | Run on connected iOS device |
| `yarn ios:release` | Release build on device |
| `yarn android` | Start for Android |
| `yarn web` | Start for web |
| `yarn clean` | Remove `.expo`, `node_modules`, `ios`, `android` |

## iOS-Specific Notes

- The app uses the **system audio route** for voice I/O, which means it works correctly with Bluetooth headphones, speaker, and other audio peripherals
- **Echo cancellation** is handled at the native level
- A development build (`APP_VARIANT=development`) is used during development for faster iteration
- The app requires microphone permission on first launch
- EAS Build can be used for CI/CD (see `eas.json` for build profiles)

## App Variants

The project supports multiple build variants:

- **development** -- used during local development (`APP_VARIANT=development`)
- **staging** -- for internal testing
- **production** -- for App Store release

Each variant can have its own app icon, bundle identifier, and configuration (see `app.config.ts`).

## Project Structure

```
mobile/
  app/
    (tabs)/
      _layout.tsx       # Tab navigator layout
      index.tsx         # Chat page (main voice interface)
      history.tsx       # Conversation history
      settings.tsx      # Settings page
    _layout.tsx         # Root layout
  assets/               # Images, fonts, icons
  lib/                  # Shared utilities
  plugins/              # Expo config plugins
```
