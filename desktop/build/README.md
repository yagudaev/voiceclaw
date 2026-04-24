# Desktop build resources

Files here are consumed by `electron-builder` at pack / sign / notarize
time. None of them get bundled into the running app.

## First-time setup: populate `.env.build`

Before you can run `yarn dist:mac`, you need credentials for Apple's
notarization service. Copy the template and fill in the three values:

```sh
cp .env.build.example .env.build
```

Then edit `.env.build` with real values sourced from:

| Variable | Where to find it |
|---|---|
| `APPLE_API_KEY` | Path to the `.p8` file you download from [App Store Connect → Users and Access → Integrations → API Keys](https://appstoreconnect.apple.com/access/integrations/api). Apple lets you download the file exactly once — keep it somewhere safe (outside the repo). |
| `APPLE_API_KEY_ID` | The Key ID, shown in the same row as the key on the API Keys page. Matches the `_XXXXXXXXXX.p8` suffix of the filename. |
| `APPLE_API_ISSUER` | The Issuer ID UUID, shown at the top of the API Keys page. One per Apple Developer team. |

If another Nano 3 Labs maintainer already has a `.p8` set up, you can
reuse theirs (copy the file to `~/.appstore/`) rather than generating a
new key. Each active team member having their own key is also fine;
Apple allows up to 50 keys per team.

## Contents

- `entitlements.mac.plist` — required macOS entitlements for hardened
  runtime (mic, camera for screen-capture APIs, JIT for V8, network
  client/server for bundled services). Used by the `mac.entitlements`
  key in `../electron-builder.yml`.

- `icon.icns` — (TODO) app icon in Apple's multi-resolution format.
  Not committed yet. When present, electron-builder uses it for the
  `.app` bundle icon, the DMG background, and the Dock icon.

## Generating `icon.icns`

When the brand artwork is ready, generate the `.icns` from a 1024×1024
PNG master:

```sh
# Requires the Xcode command-line tools (`xcrun`).
ICONSET=icon.iconset
mkdir -p "$ICONSET"
for size in 16 32 64 128 256 512 1024; do
  sips -z "$size" "$size" master.png \
    --out "$ICONSET/icon_${size}x${size}.png"
  two_size=$((size * 2))
  sips -z "$two_size" "$two_size" master.png \
    --out "$ICONSET/icon_${size}x${size}@2x.png"
done
iconutil -c icns "$ICONSET" -o icon.icns
rm -rf "$ICONSET"
```

Check it in once it's ready. Until then, `electron-builder` falls
back to Electron's default bundled icon.
