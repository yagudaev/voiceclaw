# Desktop build resources

Files here are consumed by `electron-builder` at pack / sign / notarize
time. None of them get bundled into the running app.

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
