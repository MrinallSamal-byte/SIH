# SOS Broadcast v0

Additive, fail-closed emergency broadcast type for the bitchat mesh.

## Wire format

- Packet type: `0x30` (`MessageType.SOS` in `BinaryProtocol.kt`).
- Envelope: identical to every other BitchatPacket (v1/v2 header, sender ID,
  optional recipient/flags/padding/route/signature sections). No new fields.
- Payload: byte-for-byte the same encoding used by `MESSAGE` (0x02) — the
  `BitchatMessage.toBinaryPayload()` binary format. No new codec; existing TLV/
  length-prefixed message parsing applies unchanged.
- Signature: Ed25519 over the canonical signing data (which already includes
  the type byte and excludes TTL), exactly like all other signed packets.

## Semantics

- Always relay: `PacketRelayManager.shouldRelayPacket` relays SOS whenever the
  decremented TTL is > 0. The probabilistic managed-flooding drop and the
  network-size decay never apply to SOS.
- Voice-frame treatment does not apply: SOS is not subject to the VOICE_FRAME
  TTL cap (min TTL 5 in dense networks) or its send jitter.
- Send priority: per-link BLE queues (`LinkSendQueue`) support a priority lane;
  SOS operations dequeue ahead of all buffered normal operations while the
  in-flight write is never preempted. Admission caps (max pending sends, max
  pending bytes) are unchanged — SOS jumps order, not limits.
- Security unchanged: deduplication, replay protection, and signature
  validation happen in `SecurityManager` before any relay decision, exactly as
  for other packet types.

## Compatibility

This is a purely additive change. Peers that do not implement 0x30 (older
Android builds, iOS) receive an unknown type and drop it fail-closed through
their existing unknown-type handling. Decoding of SOS packets succeeds anywhere
MESSAGE decoding succeeds because envelope and payload encodings are shared.
No exhaustive switch over `MessageType` breaks: existing dispatch sites use
`else` branches that treat unknown types as non-routable payloads but still
reach the centralized relay path.

## Recommended usage

- Default TTL 7 (`AppConstants.MESSAGE_TTL_HOPS`), same as regular
  broadcast messages; no special TTL policy is defined in v0.
- Broadcast addressing (null or broadcast recipient), like public messages.

## Explicitly out of scope (follow-ups)

- UI wiring for composing and displaying SOS conversations.
- Store-and-forward caching / gossip-sync participation for SOS packets.
- Gateway push delivery when no mesh peer is reachable.
