const crypto = require('crypto');

class SOSBuilder {
  static buildPayload({
    name,
    age,
    medicalConditions = [],
    groupSize = 1,
    transcript = "",
    latitude = null,
    longitude = null,
    landmark = ""
  }) {
    return {
      sos_uuid: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      victim_info: {
        name,
        age,
        medical_conditions: medicalConditions,
        group_size: groupSize
      },
      location: {
        latitude: latitude || 22.5726,
        longitude: longitude || 88.3639,
        landmark: landmark || "Salt Lake Sector V, Kolkata"
      },
      transcript,
      is_mesh_relayed: false,
      hopCount: 0
    };
  }
}

module.exports = SOSBuilder;
