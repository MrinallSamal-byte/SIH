/**
 * Feature 5: Low-Bandwidth WebRTC Telemedicine
 * Jitsi Meet WebRTC low-bitrate audio/video streaming session for isolated victims.
 */
class TelemedicineService {
  static createTelemedicineSession({ victim_id, doctor_id, network_quality = "2G_50KBPS" }) {
    const sessionId = `TELEMED_${Date.now()}`;
    const bitrateKbps = network_quality === "2G_50KBPS" ? 32 : 128;

    const session = {
      session_id: sessionId,
      victim_id,
      assigned_doctor_id: doctor_id,
      webrtc_room_url: `https://meet.jit.si/AapdaSetu_${sessionId}`,
      bitrate_kbps: bitrateKbps,
      mode: bitrateKbps <= 32 ? "AUDIO_ONLY_LOW_BITRATE" : "AUDIO_VIDEO_LOW_BITRATE",
      status: "SESSION_ACTIVE"
    };

    console.log(`🩺 [WebRTC Telemedicine] Created ${session.mode} session ${sessionId} (${bitrateKbps} kbps)`);
    return session;
  }
}

module.exports = TelemedicineService;
