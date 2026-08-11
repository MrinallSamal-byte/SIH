# AapdaSetu Android (Jetpack Compose)

Native Android implementation of the AapdaSetu mobile client, built from the
`stitch_aapdasetu_p2p_sos` Stitch export (Kinetic Zero design system) and
targeting protocol interop with the vendored `bitchat/` open-source mesh app
at the repo root.

## Status

This is a UI + permissions scaffold, not a finished app. Read this before
opening it in Android Studio.

**Built and real:**
- All 4 Stitch screens (Welcome, Mission Critical Setup, Manual Landmark
  Entry, Mesh Relay Inbox), matching the exported designs
- The Kinetic Zero theme (colors, type scale, shapes) as Compose theme code
- Navigation between all 4 screens plus the bottom-nav flow
- Real Android permission requests on the Setup screen: BLE (API 31+ trio,
  with a pre-31 fallback), fine location, and battery-optimization exemption
  via `PowerManager` / `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
- A from-scratch Kotlin port of bitchat's V1 binary packet format
  (`mesh/protocol/BinaryPacket.kt`) plus the real BLE service/characteristic
  UUIDs (`mesh/protocol/MeshConstants.kt`) - both verified against the
  actual vendored Swift source, not guessed

**Not built yet - the actual mesh networking:**
- `mesh/transport/MeshTransport.kt` is an interface with only a
  `NoOpMeshTransport` behind it. There is no BLE scanning, advertising, GATT
  server, or GATT client anywhere in this module yet. The Mesh Relay Inbox
  screen's list is hardcoded sample data, the same way the backend
  prototype's in-memory arrays work.
- `BinaryPacket` only implements the V1 header. V2 (source routing),
  `MessagePadding`, and Noise Protocol encryption are not ported - see the
  scope note at the top of that file.
- No persistence (Room/DataStore) - all screen state is in-memory and resets
  on process death.

## Fonts

This scaffold intentionally ships with system fonts (`FontFamily.Default`
for Inter, `FontFamily.Monospace` for Space Mono) so it compiles with zero
extra setup - no binary font files could be written by the tool that
generated this. To get the real typefaces:
1. Download **Inter** and **Space Mono** from Google Fonts.
2. Drop the `.ttf` files into `app/src/main/res/font/`.
3. Update the two `FontFamily` vals at the top of `ui/theme/Type.kt` to
   reference them via `Font(R.font.your_file_name)`.

## Building

Requires JDK 17 and a recent Android Studio. Open this `mobile-android/`
folder directly as the project root - don't open the parent `SIH-DM/`
folder, it isn't a single Gradle project.

```
File > Open > C:\Project-v2\SIH-DM\apps\mobile-android
```

Let Gradle sync, then Run. `minSdk` is 26, `compileSdk`/`targetSdk` are 35 -
bump these in `app/build.gradle.kts` if Android Studio's upgrade assistant
suggests newer values.

This was written without the ability to compile it - expect small first-sync
issues (an icon name that moved, a color-parameter name that changed between
Material3 versions, that sort of thing). The structure and logic should be
sound; treat build errors as a list of 5-minute fixes, not a reason to start
over. Paste the actual errors back and they're quick to resolve.

## Mesh protocol interop notes

`mesh/protocol/` is pure Kotlin with no Android dependencies, ported
directly from the real bitchat source vendored in this repo
(`bitchat/localPackages/BitFoundation/Sources/BitFoundation/BinaryProtocol.swift`
and `bitchat/bitchat/Services/BLE/BLEService.swift`):

- Service UUID: `F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5A` (debug) /
  `F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5C` (release)
- Characteristic UUID: `A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D`
- Target MTU: 512 bytes

Use `MeshConstants.serviceUuid(BuildConfig.DEBUG)` when wiring up real BLE
advertising/scanning, not a hardcoded UUID, so debug builds don't
accidentally show up on the production mesh.

## Next steps, in order

1. **BLE transport.** Implement `BleMeshTransport : MeshTransport` using
   `BluetoothLeAdvertiser` + `BluetoothGattServer` (peripheral role) and
   `BluetoothLeScanner` + `BluetoothGatt` (central role), advertising/scanning
   for `MeshConstants` service UUID. Needs a foreground `Service` so Android
   doesn't kill the scan in the background - that's what the Setup screen's
   "Battery Optimization" permission is for.
2. **Wire the screens to it.** `ManualLandmarkEntryScreen`'s `onBroadcast`
   callback and `MeshRelayInboxScreen`'s hardcoded list are the two seams -
   swap the sample data for `MeshTransport.incomingPackets` /
   `nearbyPeerCount`.
3. **Encryption.** The real bitchat app uses Noise Protocol handshakes
   (`bitchat/bitchat/Noise/`). `BinaryPacket` has no encryption of its own -
   don't send real SOS payloads in the clear over BLE.
4. **Persistence.** Room for the local SOS outbox / relay cache, so the
   "auto-purge 24h" concept on the Mesh screen means something.
5. **Wire to the backend.** `apps/api-gateway` (the Node/Express server one
   level up in this repo) has a real `POST /api/sos` endpoint waiting - once
   a peer has internet, that's the upload target.
