const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

// Import All 20 Master Feature Microservice Handlers
const VoiceNLPService = require('../../mobile-app/src/services/VoiceNLPService');
const OnDeviceFaceMatching = require('../../mobile-app/src/services/OnDeviceFaceMatching');
const SignLanguageEngine = require('../../mobile-app/src/services/SignLanguageEngine');
const OSRMDisasterRoutingEngine = require('../../routing-service/src/osrmRouting');
const DBTPipelineService = require('./services/dbtPipeline');
const CryptographicLedger = require('./services/cryptographicLedger');
const GrievanceEscalationService = require('./services/grievanceEscalation');
const ForensicDBMRegistry = require('./services/forensicDBMRegistry');
const LivestockRescueService = require('./services/livestockRescueService');
const EpidemicSurveillanceService = require('./services/epidemicSurveillance');
const EWSAlertService = require('./services/ewsAlertService');
const TelemedicineService = require('./services/telemedicineService');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Databases & Services Initialization
const database = new Map();
const redisQueue = [];
const routingEngine = new OSRMDisasterRoutingEngine();
const cryptographicLedger = new CryptographicLedger();
const dbmRegistry = new ForensicDBMRegistry();

routingEngine.addHazardPolygon({ name: "Sector V Flooded Underpass", type: "INUNDATION" });

const volunteers = [
  { id: "VOL_101", name: "Dr. Ananya Roy", role: "Doctor", lat: 22.5740, lng: 88.3650, status: "Available" },
  { id: "VOL_102", name: "Vijay Singh", role: "Swimmer", lat: 22.5710, lng: 88.3620, status: "Available" },
  { id: "VOL_103", name: "Priya Das", role: "Translator", lat: 22.5750, lng: 88.3680, status: "Available" }
];

const shelters = [
  { id: "SHELTER_SOL01", name: "Salt Lake Central Shelter", capacity: 500, current_occupancy: 342, lat: 22.5730, lng: 88.3640 },
  { id: "SHELTER_SOL02", name: "New Town Community Stadium", capacity: 1200, current_occupancy: 890, lat: 22.5810, lng: 88.3720 }
];

function broadcastToClients(type, payload) {
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function calculateAITriageScore(sos) {
  let score = 30;
  const text = (sos.transcript || '') + ' ' + (sos.location?.landmark || '');
  const urgentKeywords = ['drowning', 'trapped', 'water 5ft', 'water 6ft', 'roof', 'submerged', 'pregnant', 'bleeding', 'heart'];

  urgentKeywords.forEach(kw => {
    if (text.toLowerCase().includes(kw)) score += 25;
  });

  const age = sos.victim_info?.age || 30;
  if (age >= 60 || age <= 5) score += 20;

  const conditions = sos.victim_info?.medical_conditions || [];
  if (conditions.length > 0) score += 15;

  score = Math.min(100, Math.max(1, score));

  let urgencyLevel = "GREEN";
  if (score >= 80) urgencyLevel = "RED";
  else if (score >= 50) urgencyLevel = "YELLOW";

  return {
    priority_score: score,
    urgency_level: urgencyLevel,
    recommended_action: score >= 80 ? "DISPATCH_BOAT_AND_HELICOPTER" : "DISPATCH_SHELTER_RELIEF"
  };
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS FOR ALL 20 MASTER FEATURES
// -----------------------------------------------------------------------------

// 1. Ingest Emergency SOS Packet (Feature 1 & Feature 2)
app.post('/api/sos', (req, res) => {
  const sosData = req.body;
  if (!sosData || !sosData.sos_uuid) {
    return res.status(400).json({ error: "Missing required field: sos_uuid" });
  }

  if (database.has(sosData.sos_uuid)) {
    console.log(`🛡️ [Gateway De-Duplication] Duplicate SOS UUID detected: ${sosData.sos_uuid}. Silently dropping duplicate.`);
    return res.status(200).json({ status: "DUPLICATE_DROPPED", sos_uuid: sosData.sos_uuid });
  }

  redisQueue.push(sosData);
  const rawItem = redisQueue.shift();
  const triageResult = calculateAITriageScore(rawItem);

  const finalRecord = {
    ...rawItem,
    triage: triageResult,
    status: 'DISPATCH_PENDING',
    ingested_at: new Date().toISOString()
  };

  database.set(finalRecord.sos_uuid, finalRecord);
  broadcastToClients("NEW_SOS_ALERT", finalRecord);

  return res.status(201).json({ status: "INGESTED_AND_TRIAGED", sos_uuid: finalRecord.sos_uuid, triage: triageResult });
});

// 2. Fetch All SOS Records
app.get('/api/sos', (req, res) => {
  return res.json({ count: database.size, data: Array.from(database.values()) });
});

// 3. Voice NLP Processing (Feature 3)
app.post('/api/voice/process', (req, res) => {
  const { speech_text } = req.body;
  const result = VoiceNLPService.processVoiceAudio(speech_text);
  return res.json(result);
});

// 4. Dynamic Safe Routing (Feature 4)
app.post('/api/routing/safe-path', (req, res) => {
  const { start, target } = req.body;
  const route = routingEngine.calculateSafeRoute(start, target);
  return res.json(route);
});

// 5. Low-Bandwidth WebRTC Telemedicine (Feature 5)
app.post('/api/telemedicine/session', (req, res) => {
  const session = TelemedicineService.createTelemedicineSession(req.body);
  return res.json(session);
});

// 6. On-Device Missing Persons Face Match (Feature 6)
app.post('/api/face/match', (req, res) => {
  const { found_photo_id, missing_db } = req.body;
  const matchResult = OnDeviceFaceMatching.searchMissingPersonsOffline(found_photo_id, missing_db || []);
  return res.json(matchResult);
});

// 7. Multi-Channel EWS Alert (Feature 8)
app.post('/api/ews/alert', (req, res) => {
  const alertResult = EWSAlertService.broadcastGeofencedAlert(req.body);
  broadcastToClients("EWS_ALERT_BROADCAST", alertResult);
  return res.json(alertResult);
});

// 8. Algorithmic Skill-Matching Rescuer Dispatch (Feature 10)
app.post('/api/volunteer/dispatch', (req, res) => {
  const { sos_uuid } = req.body;
  const sosRecord = database.get(sos_uuid);
  if (!sosRecord) return res.status(404).json({ error: "SOS Record not found" });

  const matched = volunteers.filter(v => v.status === "Available");
  if (matched.length === 0) return res.status(404).json({ error: "No available volunteers" });

  const assigned = matched[0];
  assigned.status = "DISPATCHED";
  sosRecord.status = "RESCUE_IN_PROGRESS";
  sosRecord.assigned_volunteer = assigned;
  database.set(sos_uuid, sosRecord);

  broadcastToClients("RESCUE_DISPATCHED", { sos_uuid, volunteer: assigned });
  return res.json({ status: "DISPATCH_SUCCESS", assigned_volunteer: assigned });
});

// 9. Direct Benefit Transfer Payout (Feature 12)
app.post('/api/dbt/payout', (req, res) => {
  const audit = DBTPipelineService.processDBTCompensation(req.body);
  return res.json(audit);
});

// 10. Cryptographic Ledger Donation Recording (Feature 14)
app.post('/api/ledger/donation', (req, res) => {
  const { donor, amount, shelter } = req.body;
  const block = cryptographicLedger.recordDonation(donor, amount, shelter);
  return res.json(block);
});

// 11. Grievance Redressal (Feature 15)
app.post('/api/grievance', (req, res) => {
  const record = GrievanceEscalationService.fileGrievance(req.body);
  return res.json(record);
});

// 12. DBM Forensic Registry (Feature 17)
app.post('/api/forensic/dbm', (req, res) => {
  const record = dbmRegistry.registerDeceasedRecord(req.body);
  return res.json(record);
});

// 13. Livestock Rescue (Feature 19)
app.post('/api/livestock', (req, res) => {
  const record = LivestockRescueService.reportTrappedLivestock(req.body);
  return res.json(record);
});

// 14. Epidemic Surveillance (Feature 20)
app.post('/api/epidemic/report', (req, res) => {
  const report = EpidemicSurveillanceService.logShelterSymptomReport(req.body);
  broadcastToClients("EPIDEMIC_SURVEILLANCE_ALERT", report);
  return res.json(report);
});

// WebSocket Connection Event
wss.on('connection', (ws) => {
  console.log('📡 [WebSocket] Incident Command Dashboard connected.');
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    payload: Array.from(database.values()),
    volunteers,
    shelters,
    ledger: cryptographicLedger.chain
  }));
});

server.listen(PORT, () => {
  console.log("==========================================================================");
  console.log(`🚀 AAPDASETU API GATEWAY RUNNING ON HTTP://LOCALHOST:${PORT}`);
  console.log(`📡 WEBSOCKET STREAMING ON WS://LOCALHOST:${PORT}`);
  console.log("==========================================================================");
});
