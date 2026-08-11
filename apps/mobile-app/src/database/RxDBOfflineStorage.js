const crypto = require('crypto');

/**
 * RxDB-inspired Offline Local Storage for AapdaSetu P2P Client.
 * Buffers SOS requests locally when cellular network is unavailable.
 */
class RxDBOfflineStorage {
  constructor() {
    this.storage = new Map();
  }

  saveSOS(sosData) {
    const record = {
      ...sosData,
      sos_uuid: sosData.sos_uuid || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      sync_status: 'OFFLINE_BUFFERED'
    };
    this.storage.set(record.sos_uuid, record);
    console.log(`💾 [RxDB Offline DB] Stored SOS record locally. UUID: ${record.sos_uuid}`);
    return record;
  }

  getPendingSOS() {
    return Array.from(this.storage.values()).filter(r => r.sync_status === 'OFFLINE_BUFFERED');
  }

  markSynced(sosUuid) {
    if (this.storage.has(sosUuid)) {
      const record = this.storage.get(sosUuid);
      record.sync_status = 'SYNCED_TO_CLOUD';
      this.storage.set(sosUuid, record);
      console.log(`✅ [RxDB Offline DB] Marked record ${sosUuid} as SYNCED_TO_CLOUD.`);
    }
  }
}

module.exports = RxDBOfflineStorage;
