# OpenClaw / Kira

OpenClaw gateway integration for the VoiceClaw relay server.

## Connection

The relay server calls Kira via the existing OpenClaw gateway:

```
POST <gatewayUrl>/voiceclaw/v1/chat/completions
Authorization: Bearer <authToken>
x-openclaw-session-key: realtime:<sessionId>
```

No additional setup needed — the gateway is already running and accessible
from the mobile app's existing custom pipeline config.
