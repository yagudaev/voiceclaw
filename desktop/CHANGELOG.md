# Changelog

## [0.2.1](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.2.0...desktop-v0.2.1) (2026-04-26)


### Bug Fixes

* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))

## [0.2.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.1.0...desktop-v0.2.0) (2026-04-26)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))
