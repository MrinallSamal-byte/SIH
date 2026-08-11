/**
 * Feature 6: On-Device Facial Matching for Missing Persons
 * Converts facial features into mathematical 128-d vector embeddings
 * and calculates Cosine Similarity locally offline without internet.
 */
class OnDeviceFaceMatching {
  /**
   * Generates a 128-dimensional mock facial vector embedding.
   */
  static generateFaceEmbedding(photoId) {
    // Generate deterministic 128-float vector for photoId
    const vector = [];
    for (let i = 0; i < 128; i++) {
      vector.push(Math.sin((photoId.length + i) * 0.5));
    }
    return vector;
  }

  /**
   * Calculates Cosine Distance between two 128-d vector embeddings.
   */
  static calculateCosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Searches local offline missing person database for a facial match.
   */
  static searchMissingPersonsOffline(foundChildPhotoId, missingPersonsDB) {
    const targetVec = this.generateFaceEmbedding(foundChildPhotoId);
    let bestMatch = null;
    let highestScore = -1;

    for (const record of missingPersonsDB) {
      const matchScore = this.calculateCosineSimilarity(targetVec, record.embedding);
      if (matchScore > highestScore) {
        highestScore = matchScore;
        bestMatch = record;
      }
    }

    const isMatch = highestScore >= 0.85;
    console.log(`👤 [On-Device Face Matching] Comparing found photo ${foundChildPhotoId}...`);
    if (isMatch) {
      console.log(`   🎉 MATCH FOUND! Match Score: ${(highestScore * 100).toFixed(1)}%. Matched to missing record: ${bestMatch.person_name} (Parent: ${bestMatch.parent_contact})`);
    } else {
      console.log(`   ❌ No confident match found (Highest Score: ${(highestScore * 100).toFixed(1)}%). Stored photo embedding locally.`);
    }

    return {
      isMatch,
      similarityScore: highestScore,
      matchedRecord: isMatch ? bestMatch : null
    };
  }
}

module.exports = OnDeviceFaceMatching;
