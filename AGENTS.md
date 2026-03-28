# VoiceClaw

OpenClaw companion iOS app for voice chat via Vapi.

## Tech Stack

- **Runtime:** Expo SDK 55 with React Native
- **UI:** React Native Reusables (shadcn/ui for RN), NativeWind v4
- **Database:** expo-sqlite + Drizzle ORM
- **Routing:** Expo Router
- **Voice:** Custom Expo Turbo Module wrapping Vapi's native Swift SDK (client-sdk-ios)
- **Package Manager:** yarn (NEVER npm)

## Key Architecture Decisions

Vapi's RN SDK is incompatible with Expo SDK 55 (requires Old Architecture / newArchEnabled=false). Solution: custom Expo Turbo Module wrapping Vapi's native Swift SDK.

All decisions should prioritize the iOS experience. Voice integration via native Swift bridge, not the broken RN SDK.

## Testing

- Test on physical iPhone, NOT web or simulator
- Primary test device: iPhone 12 Pro (UDID: 00008101-000D69900150001E)
- CoreDevice UUID: 56C80741-243D-5A87-91B2-6412AB6C2C72 (xcrun devicectl only)
- Build command: `npx expo run:ios --no-install -d 00008101-000D69900150001E`
- Screenshots: `idb screenshot /tmp/screenshot.png --udid 00008101-000D69900150001E`
- When rebuilding native code, build for the physical iPhone, not the simulator

## Linear

- Project: VoiceClaw
- Original bootstrap ticket: NAN-529

## Code Style

- No semicolons in TypeScript/JavaScript
- Helper functions at bottom of files, public interface and constants at top
- In React components: imports, constants, exported component, then helper components/functions at bottom
- In utility files: imports, constants, exported functions, then internal helpers

## Common Commands

```bash
# Install dependencies
yarn install

# Start Expo dev server
yarn start

# Build for iOS device
npx expo run:ios --no-install -d 00008101-000D69900150001E

# Type check
npx tsc --noEmit
```
