const crypto = require('crypto');

/**
 * BitChat-inspired Peer-to-Peer BLE Mesh Communication & Protocol Engine.
 * Enables offline SOS packets to hop across neighboring devices until
 * an online peer relays them to the central command room.
 */
class BitChatMeshEngine {
  constructor(deviceId, isConnectedToInternet = false) {
    this.deviceId = deviceId;
    this.isConnectedToInternet = isConnectedToInternet;
    this.discoveredPeers = new Set();
    this.meshRoutingTable = new Map(); // UUID -> Packet
    this.sharedSecret = "AAPDASETU_BITCHAT_NOISE_KEY_2026";
  }

  /**
   * Simulates BitChat Bluetooth Low Energy (BLE) peripheral & central discovery.
   */
  discoverPeer(peerDevice) {
    if (peerDevice.deviceId !== this.deviceId) {
      this.discoveredPeers.add(peerDevice);
      console.log(`[BitChat BLE Mesh] ${this.deviceId} discovered peer device: ${peerDevice.deviceId}`);
    }
  }

  /**
   * Encrypts SOS packet using BitChat Noise-protocol symmetric wrapper.
   */
  encryptPacket(packet) {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      crypto.scryptSync(this.sharedSecret, 'salt', 32),
      Buffer.alloc(16, 0)
    );
    let encrypted = cipher.update(JSON.stringify(packet), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
      encryptedData: encrypted,
      senderId: this.deviceId,
      sos_uuid: packet.sos_uuid,
      hopCount: (packet.hopCount || 0) + 1
    };
  }

  /**
   * Decrypts BitChat mesh packet.
   */
  decryptPacket(encryptedMeshPacket) {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.scryptSync(this.sharedSecret, 'salt', 32),
      Buffer.alloc(16, 0)
    );
    let decrypted = decipher.update(encryptedMeshPacket.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  /**
   * BitChat Mesh Relay: Broadcasts or relays packet to all discovered peers.
   */
  relayPacket(sosPacket) {
    const meshPacket = this.encryptPacket(sosPacket);
    this.meshRoutingTable.set(sosPacket.sos_uuid, meshPacket);
    console.log(`\n📡 [BitChat BLE Mesh Hop #${meshPacket.hopCount}] Device ${this.deviceId} broadcasting encrypted SOS packet (UUID: ${sosPacket.sos_uuid})`);

    let relayedSuccess = false;
    for (const peer of this.discoveredPeers) {
      console.log(`   ➡️ Relaying packet to peer device: ${peer.deviceId}...`);
      const received = peer.receiveMeshPacket(meshPacket);
      if (received) relayedSuccess = true;
    }
    return relayedSuccess;
  }

  /**
   * Receives incoming mesh packet from a peer.
   */
  receiveMeshPacket(encryptedMeshPacket) {
    if (this.meshRoutingTable.has(encryptedMeshPacket.sos_uuid)) {
      console.log(`   ⚠️ [BitChat Mesh] Device ${this.deviceId} ignored duplicate UUID: ${encryptedMeshPacket.sos_uuid}`);
      return false;
    }

    this.meshRoutingTable.set(encryptedMeshPacket.sos_uuid, encryptedMeshPacket);
    const decryptedSOS = this.decryptPacket(encryptedMeshPacket);
    console.log(`   ✅ [BitChat Mesh Received] Device ${this.deviceId} successfully decrypted SOS packet from ${decryptedSOS.victim_info?.name || 'Victim'}`);

    if (this.isConnectedToInternet) {
      console.log(`   ⚡ [BitChat Mesh Gateway Sync] Device ${this.deviceId} HAS INTERNET! Relaying SOS payload to cloud API gateway...`);
      return decryptedSOS;
    } else {
      console.log(`   🔁 [BitChat Store-and-Forward] Device ${this.deviceId} has no internet. Retaining in mesh routing table for next hop.`);
      return true;
    }
  }
}

module.exports = BitChatMeshEngine;
