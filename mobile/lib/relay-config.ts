// Default WebSocket URL the realtime client connects to. The mobile app is a
// thin voice client — tools (read/write/edit/bash) execute on the desktop
// running the relay-server, so the device must reach that machine. On the
// development tailnet the desktop relay lives at 100.82.61.115:8080. Override
// per-environment via EXPO_PUBLIC_REALTIME_SERVER_URL (e.g. ws://localhost:8080/ws
// when running the relay on the same machine as the simulator).

export const DEFAULT_REALTIME_SERVER_URL =
  process.env.EXPO_PUBLIC_REALTIME_SERVER_URL || 'ws://100.82.61.115:8080/ws'
