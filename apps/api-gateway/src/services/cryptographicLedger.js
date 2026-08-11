const crypto = require('crypto');

/**
 * Feature 14: Cryptographic Aid & Donation Tracker
 * SHA-256 Hash-Chain Ledger tracking donations to vendor purchases and shelter QR distributions.
 */
class CryptographicLedger {
  constructor() {
    this.chain = [];
    this.createBlock("GENESIS_BLOCK", { message: "AapdaSetu Aid Ledger Initialized" });
  }

  createBlock(previousHash, payload) {
    const block = {
      index: this.chain.length + 1,
      timestamp: new Date().toISOString(),
      payload,
      previousHash,
      hash: ''
    };

    block.hash = crypto.createHash('sha256').update(JSON.stringify(block)).digest('hex');
    this.chain.push(block);
    console.log(`🔗 [Cryptographic Ledger] Block #${block.index} Mined! Hash: ${block.hash.substring(0, 16)}...`);
    return block;
  }

  recordDonation(donorName, amountINR, targetShelter) {
    const previousHash = this.chain[this.chain.length - 1].hash;
    return this.createBlock(previousHash, {
      event: "DONATION_RECEIVED",
      donor: donorName,
      amount_inr: amountINR,
      assigned_shelter: targetShelter
    });
  }

  recordDistribution(vendorItem, itemQty, shelterId) {
    const previousHash = this.chain[this.chain.length - 1].hash;
    return this.createBlock(previousHash, {
      event: "AID_ITEM_DISTRIBUTED_SHELTER_QR",
      item: vendorItem,
      quantity: itemQty,
      shelter_id: shelterId
    });
  }
}

module.exports = CryptographicLedger;
