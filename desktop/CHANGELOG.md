# Changelog

## [0.10.47](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.46...desktop-v0.10.47) (2026-05-05)


### Features

* **desktop:** disable image attachments on Grok Voice (NAN-718) ([#400](https://github.com/yagudaev/voiceclaw/issues/400)) ([ddd436c](https://github.com/yagudaev/voiceclaw/commit/ddd436c32ec4e0840d5b4c6490f541e122f745d3))

## [0.10.46](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.45...desktop-v0.10.46) (2026-05-05)


### Bug Fixes

* **relay:** drop OpenAI summarizer dep, route summarization through active provider ([#398](https://github.com/yagudaev/voiceclaw/issues/398)) ([2573000](https://github.com/yagudaev/voiceclaw/commit/2573000a5e1f0f69f46888559570e91482d48497))

## [0.10.45](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.44...desktop-v0.10.45) (2026-05-04)


### Bug Fixes

* **desktop:** bundle Gemini voice previews; rip out lazy cache (NAN-715) ([#395](https://github.com/yagudaev/voiceclaw/issues/395)) ([8242694](https://github.com/yagudaev/voiceclaw/commit/82426944a6e6f8cd3eff817b6c453886dab514b3))

## [0.10.44](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.43...desktop-v0.10.44) (2026-05-04)


### Features

* **desktop:** xAI voice previews via bundled WAVs (NAN-714) ([#393](https://github.com/yagudaev/voiceclaw/issues/393)) ([a3ca846](https://github.com/yagudaev/voiceclaw/commit/a3ca846bc481b44bb4b411be339fda79ea1ba707))

## [0.10.43](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.42...desktop-v0.10.43) (2026-05-04)


### Features

* **desktop:** voice preview button in Settings (NAN-713) ([#391](https://github.com/yagudaev/voiceclaw/issues/391)) ([2944366](https://github.com/yagudaev/voiceclaw/commit/2944366711e75a520c2f0e7608c96a79f0dc1a93))

## [0.10.42](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.41...desktop-v0.10.42) (2026-05-01)


### Bug Fixes

* **relay:** Gemini 400, action labels, dedupe errors on upgrade rejection ([#387](https://github.com/yagudaev/voiceclaw/issues/387)) ([26b036e](https://github.com/yagudaev/voiceclaw/commit/26b036e11b16eb47ee7d909f816a04f128a3260f))

## [0.10.41](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.40...desktop-v0.10.41) (2026-05-01)


### Features

* **relay:** surface provider auth/quota errors with billing links ([#380](https://github.com/yagudaev/voiceclaw/issues/380)) ([6964c5e](https://github.com/yagudaev/voiceclaw/commit/6964c5e377ed03062e2fc326a9667b734b231966))

## [0.10.40](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.39...desktop-v0.10.40) (2026-05-01)


### Features

* **desktop:** in-app brain diagnostic button in Settings → Debug ([#373](https://github.com/yagudaev/voiceclaw/issues/373)) ([9c99f12](https://github.com/yagudaev/voiceclaw/commit/9c99f12c23d2875498bb5dc0f73ace8207c02391))

## [0.10.39](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.38...desktop-v0.10.39) (2026-05-01)


### Features

* **brain:** reliability — upstream errors + e2e harness + doctor script ([#370](https://github.com/yagudaev/voiceclaw/issues/370)) ([a4f501c](https://github.com/yagudaev/voiceclaw/commit/a4f501c23a43c5dd4d77ec4c3b33d460c4cd592d))

## [0.10.38](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.37...desktop-v0.10.38) (2026-05-01)


### Features

* **desktop:** allow typed-text interrupt of streaming reply (NAN-704) ([#345](https://github.com/yagudaev/voiceclaw/issues/345)) ([9156fdf](https://github.com/yagudaev/voiceclaw/commit/9156fdf8c08608e7e325434ed9b83ac95cb0f530))

## [0.10.37](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.36...desktop-v0.10.37) (2026-05-01)


### Features

* **desktop:** move attach to inline composer icon (NAN-703) ([#344](https://github.com/yagudaev/voiceclaw/issues/344)) ([f2c1bb1](https://github.com/yagudaev/voiceclaw/commit/f2c1bb18a734cc2736ecd0f6016663ba83921540))
* **desktop:** structured tool-call panels with streaming brain response (NAN-702) ([#343](https://github.com/yagudaev/voiceclaw/issues/343)) ([7995bfe](https://github.com/yagudaev/voiceclaw/commit/7995bfeb0844e9f2361f520fadd61613dfa7d41d))


### Bug Fixes

* **desktop:** remove hoverable phantom element on composer textarea border (NAN-705) ([#360](https://github.com/yagudaev/voiceclaw/issues/360)) ([4b4f28e](https://github.com/yagudaev/voiceclaw/commit/4b4f28e98969fc473869ea7ba76953b2383e871e))

## [0.10.36](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.35...desktop-v0.10.36) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.35](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.34...desktop-v0.10.35) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.34](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.33...desktop-v0.10.34) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.33](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.32...desktop-v0.10.33) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.32](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.31...desktop-v0.10.32) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.31](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.30...desktop-v0.10.31) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.30](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.29...desktop-v0.10.30) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.29](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.28...desktop-v0.10.29) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.28](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.27...desktop-v0.10.28) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.27](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.26...desktop-v0.10.27) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.26](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.25...desktop-v0.10.26) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.25](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.24...desktop-v0.10.25) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.24](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.23...desktop-v0.10.24) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.23](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.22...desktop-v0.10.23) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.22](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.21...desktop-v0.10.22) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.21](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.20...desktop-v0.10.21) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** bundle openclaw templates + repair workspace sentinel-skip ([#342](https://github.com/yagudaev/voiceclaw/issues/342)) ([7ec1430](https://github.com/yagudaev/voiceclaw/commit/7ec1430dd8317c1835b1fe24bda9cfb1625e0bc8))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.20](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.19...desktop-v0.10.20) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.19](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.18...desktop-v0.10.19) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.18](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.17...desktop-v0.10.18) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.17](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.16...desktop-v0.10.17) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.16](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.15...desktop-v0.10.16) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.15](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.14...desktop-v0.10.15) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.14](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.13...desktop-v0.10.14) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.13](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.12...desktop-v0.10.13) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.12](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.11...desktop-v0.10.12) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.11](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.10...desktop-v0.10.11) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.10](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.9...desktop-v0.10.10) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.9](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.8...desktop-v0.10.9) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.8](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.7...desktop-v0.10.8) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.7](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.6...desktop-v0.10.7) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.6](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.5...desktop-v0.10.6) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.6](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.5...desktop-v0.10.6) (2026-05-01)


### Features

* add web_search tool (Tavily) for fast realtime lookups ([#217](https://github.com/yagudaev/voiceclaw/issues/217)) ([be569c7](https://github.com/yagudaev/voiceclaw/commit/be569c71b0f38f3ffbd3155524656d4792090da8))
* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))
* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))
* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))
* **desktop:** floating call bar ([#214](https://github.com/yagudaev/voiceclaw/issues/214)) ([f43c077](https://github.com/yagudaev/voiceclaw/commit/f43c077e13c7fa9418a1979efa9b71a85ffd7eac))
* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))
* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))
* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))
* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))
* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))
* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))
* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))
* **desktop:** wire onboarding wizard to first-run + SQLite resume ([#211](https://github.com/yagudaev/voiceclaw/issues/211)) ([a0f13bb](https://github.com/yagudaev/voiceclaw/commit/a0f13bbb7b5eea4aae40ca81f09dc5fdaffca3ea))
* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))
* **NAN-636:** add minimal volume control for agent audio output ([#229](https://github.com/yagudaev/voiceclaw/issues/229)) ([af1a9f9](https://github.com/yagudaev/voiceclaw/commit/af1a9f9288bbb8f020547ba820b2d446289453f7))
* **NAN-640:** inject recent history plus summary on voice session resume ([#230](https://github.com/yagudaev/voiceclaw/issues/230)) ([6bd1e9c](https://github.com/yagudaev/voiceclaw/commit/6bd1e9c3e99a8da2fffab56251260737547c6810))
* **NAN-644:** increase desktop screen-share resolution and JPEG quality ([#224](https://github.com/yagudaev/voiceclaw/issues/224)) ([03d8cf0](https://github.com/yagudaev/voiceclaw/commit/03d8cf0f8f2952e4c8c1c19183f09b8da3725e68))
* **NAN-671:** remove OpenAI Realtime from onboarding provider picker ([#223](https://github.com/yagudaev/voiceclaw/issues/223)) ([357a0c7](https://github.com/yagudaev/voiceclaw/commit/357a0c78b45582e80104b4cfdc68fe12a84eb947))
* **telemetry:** add PostHog for analytics + error tracking across all clients ([#212](https://github.com/yagudaev/voiceclaw/issues/212)) ([3809916](https://github.com/yagudaev/voiceclaw/commit/3809916dd920fc1d3fb79b8fef02367e5a325fb8))


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))
* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))
* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))
* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))
* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))
* **desktop:** keep VoiceClaw in Cmd+Tab after closing main window ([#216](https://github.com/yagudaev/voiceclaw/issues/216)) ([e27e799](https://github.com/yagudaev/voiceclaw/commit/e27e799f4b7fc235e61a7a11667061827e22baee))
* **desktop:** make signing fail loudly + diagnose cert ([#247](https://github.com/yagudaev/voiceclaw/issues/247)) ([3800669](https://github.com/yagudaev/voiceclaw/commit/3800669f220b4380cf0173d1fe382268a2e945aa))
* **desktop:** make tray icon visible + dev dock icon match production ([#213](https://github.com/yagudaev/voiceclaw/issues/213)) ([85dbb64](https://github.com/yagudaev/voiceclaw/commit/85dbb645c59928d5ee0cfc7337ceba40a608a66b))
* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))
* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))
* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))
* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))
* **desktop:** surface Screen Recording permission error + register display media handler ([#163](https://github.com/yagudaev/voiceclaw/issues/163)) ([6d02a16](https://github.com/yagudaev/voiceclaw/commit/6d02a16252093d261e3609eb13294559084da15c))
* **desktop:** use boolean notarize flag for electron-builder 26 ([#239](https://github.com/yagudaev/voiceclaw/issues/239)) ([20b1a9f](https://github.com/yagudaev/voiceclaw/commit/20b1a9f4c748c7c9c23b005ce573773461382b1f))
* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))
* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))
* **monorepo:** isolate better-sqlite3 per workspace to end ABI ping-pong ([#176](https://github.com/yagudaev/voiceclaw/issues/176)) ([ab70938](https://github.com/yagudaev/voiceclaw/commit/ab7093873a073f643d52a2dc582a64ceaa485509))
* **NAN-642:** de-dupe streaming words in desktop conversation renderer ([#221](https://github.com/yagudaev/voiceclaw/issues/221)) ([edaeee1](https://github.com/yagudaev/voiceclaw/commit/edaeee1f3c359d3e5117d7a67023da27dbcfe2f8))
* **NAN-670, NAN-675:** thumbnail icon fallback + deterministic picker order ([#231](https://github.com/yagudaev/voiceclaw/issues/231)) ([8ac51e3](https://github.com/yagudaev/voiceclaw/commit/8ac51e38fe3c825becfe6dee0921f10beaf55242))
* **NAN-674:** suppress empty placeholder bubble in chat UI ([#228](https://github.com/yagudaev/voiceclaw/issues/228)) ([eb71ae2](https://github.com/yagudaev/voiceclaw/commit/eb71ae2753aa897af46316f7e064416e13cd77f8))
* **relay:** reconnect on Gemini 1011 + clean transcript state across rotation ([#164](https://github.com/yagudaev/voiceclaw/issues/164)) ([18eda03](https://github.com/yagudaev/voiceclaw/commit/18eda03047f86912e82122a18bc8f4da011d2b37))

## [0.10.5](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.4...desktop-v0.10.5) (2026-05-01)


### Features

* **desktop:** iMessage-style time grouping in chat (NAN-680) ([#308](https://github.com/yagudaev/voiceclaw/issues/308)) ([31af4e1](https://github.com/yagudaev/voiceclaw/commit/31af4e1d6c807428a22804ff2c87e00f38a0d76f))

## [0.10.4](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.3...desktop-v0.10.4) (2026-05-01)


### Bug Fixes

* **desktop:** openclaw subprocess exits on startup due to invalid config schema and port parsed as subcommand ([#318](https://github.com/yagudaev/voiceclaw/issues/318)) ([75d63dd](https://github.com/yagudaev/voiceclaw/commit/75d63dd80c25a41a488886eb28af7548d86aa7d7))

## [0.10.3](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.2...desktop-v0.10.3) (2026-05-01)


### Features

* **desktop:** in-app auto-update via electron-updater (NAN-688) ([#292](https://github.com/yagudaev/voiceclaw/issues/292)) ([c38ee63](https://github.com/yagudaev/voiceclaw/commit/c38ee63a94e7d2a8bf1b9adfc7e96e5f6e757cff))

## [0.10.2](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.1...desktop-v0.10.2) (2026-05-01)


### Features

* **desktop:** image attachments in chat (NAN-646 MVP) ([#309](https://github.com/yagudaev/voiceclaw/issues/309)) ([a9ca0cb](https://github.com/yagudaev/voiceclaw/commit/a9ca0cb65b31fa1d96169c138cbf4cea96e5b7e1))

## [0.10.1](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.10.0...desktop-v0.10.1) (2026-05-01)


### Bug Fixes

* **desktop:** default wizard voice to Zephyr + log preview failures ([#314](https://github.com/yagudaev/voiceclaw/issues/314)) ([cad7669](https://github.com/yagudaev/voiceclaw/commit/cad7669692a28c492617a6e4b88e788b13c90fb1))

## [0.10.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.9.1...desktop-v0.10.0) (2026-05-01)


### Features

* **desktop:** typed text input in chat composer (NAN-638) ([#306](https://github.com/yagudaev/voiceclaw/issues/306)) ([e5c98af](https://github.com/yagudaev/voiceclaw/commit/e5c98afa4afd3f0002da02eddcf64ee7cc1574f3))

## [0.9.1](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.9.0...desktop-v0.9.1) (2026-04-30)


### Bug Fixes

* **desktop:** add missing archiver dep to fix Cannot find module crash ([#310](https://github.com/yagudaev/voiceclaw/issues/310)) ([e2e2561](https://github.com/yagudaev/voiceclaw/commit/e2e25613650fbacf572440281366057b3e2340cc))

## [0.9.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.8.0...desktop-v0.9.0) (2026-04-30)


### Features

* **desktop:** right-click delete message in chat (NAN-679) ([#296](https://github.com/yagudaev/voiceclaw/issues/296)) ([e39a747](https://github.com/yagudaev/voiceclaw/commit/e39a7476dabdf8c581dd70ba1beedeb6a31ac5fa))


### Bug Fixes

* **desktop:** per-provider voice persistence + Grok default Ara (NAN-676) ([#300](https://github.com/yagudaev/voiceclaw/issues/300)) ([d634583](https://github.com/yagudaev/voiceclaw/commit/d634583a581693b26fc08f403f2179aa1f5bff79))

## [0.8.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.7.2...desktop-v0.8.0) (2026-04-30)


### Features

* **desktop:** show/hide toggle on onboarding API key field (NAN-683) ([#294](https://github.com/yagudaev/voiceclaw/issues/294)) ([6aad653](https://github.com/yagudaev/voiceclaw/commit/6aad65359ab8a75b7f27256f1241f98bc0d532d4))

## [0.7.2](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.7.1...desktop-v0.7.2) (2026-04-30)


### Bug Fixes

* **desktop:** wire Google sign-in callback to complete onboarding (NAN-694) ([#301](https://github.com/yagudaev/voiceclaw/issues/301)) ([1ac1d60](https://github.com/yagudaev/voiceclaw/commit/1ac1d60591611fd8e7d38ff8dfb759534df8630f))

## [0.7.1](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.7.0...desktop-v0.7.1) (2026-04-30)


### Bug Fixes

* **desktop:** inject BRAIN_GATEWAY_URL into relay + self-heal Gemini config (NAN-695) ([#298](https://github.com/yagudaev/voiceclaw/issues/298)) ([8fc5489](https://github.com/yagudaev/voiceclaw/commit/8fc54894f895c56e38dd0a582ffad7325d6bbfb1))

## [0.7.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.6.0...desktop-v0.7.0) (2026-04-30)


### Features

* **desktop:** export diagnostic bundle for support ([#293](https://github.com/yagudaev/voiceclaw/issues/293)) ([c951cdf](https://github.com/yagudaev/voiceclaw/commit/c951cdf71f2c3408f4c17b3c85ff0d85650f2fa3))

## [0.6.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.5.0...desktop-v0.6.0) (2026-04-30)


### Features

* **desktop:** inline tool-call rows in chat (NAN-690) ([#287](https://github.com/yagudaev/voiceclaw/issues/287)) ([d792f35](https://github.com/yagudaev/voiceclaw/commit/d792f359d17dbcf7e299fa56311d6f7e287ef58d))

## [0.5.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.4.0...desktop-v0.5.0) (2026-04-30)


### Features

* **desktop:** add re-run onboarding button to Settings ([#285](https://github.com/yagudaev/voiceclaw/issues/285)) ([83e5662](https://github.com/yagudaev/voiceclaw/commit/83e5662f2ad80ff2171fa82a68ab698b4a77fdb1))

## [0.4.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.3.3...desktop-v0.4.0) (2026-04-30)


### Features

* **desktop:** wizard captures agent name + voice + description, greets out loud ([#282](https://github.com/yagudaev/voiceclaw/issues/282)) ([39a7d85](https://github.com/yagudaev/voiceclaw/commit/39a7d853ca9d2b0d8b0b9c5f0dccfc88386849df))

## [0.3.3](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.3.2...desktop-v0.3.3) (2026-04-30)


### Bug Fixes

* **desktop:** wire bundled service defaults on fresh install (NAN-686, NAN-687) ([#280](https://github.com/yagudaev/voiceclaw/issues/280)) ([4f528cd](https://github.com/yagudaev/voiceclaw/commit/4f528cd6c9ec9830ac78ea19b2bd94b302b88dcb))

## [0.3.2](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.3.1...desktop-v0.3.2) (2026-04-30)


### Bug Fixes

* **desktop:** drop misleading Accessibility permission ask from onboarding ([0328136](https://github.com/yagudaev/voiceclaw/commit/03281360af095b4e300f8aa717335d76be314ab9))

## [0.3.1](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.3.0...desktop-v0.3.1) (2026-04-30)


### Bug Fixes

* **desktop:** stage prod deps for electron-builder and smoke-test packaged app ([#274](https://github.com/yagudaev/voiceclaw/issues/274)) ([32c8a48](https://github.com/yagudaev/voiceclaw/commit/32c8a484b8e83b408ec9694fb89c13427d8d75b6))

## [0.3.0](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.2.3...desktop-v0.3.0) (2026-04-29)


### Features

* **desktop:** bundle relay-server as a managed service in DMG (NAN-681 part 1) ([#269](https://github.com/yagudaev/voiceclaw/issues/269)) ([745d64c](https://github.com/yagudaev/voiceclaw/commit/745d64c0b6f8000ced9963ceb755aae43b1233a1))

## [0.2.3](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.2.2...desktop-v0.2.3) (2026-04-29)


### Bug Fixes

* **brain:** persist brain results to local DB independent of model speech ([#266](https://github.com/yagudaev/voiceclaw/issues/266)) ([3ba6d32](https://github.com/yagudaev/voiceclaw/commit/3ba6d32aca34165f31b269d463295ee19a663f3a))

## [0.2.2](https://github.com/yagudaev/voiceclaw/compare/desktop-v0.2.1...desktop-v0.2.2) (2026-04-26)


### Bug Fixes

* **desktop:** pin electron-builder publish to desktop-v tags ([#250](https://github.com/yagudaev/voiceclaw/issues/250)) ([02a86fb](https://github.com/yagudaev/voiceclaw/commit/02a86fbb47ad1f604a01811e62b002ff3614e075))

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
