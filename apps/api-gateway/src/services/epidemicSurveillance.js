/**
 * Feature 20: Crowdsourced Epidemic & WASH Surveillance Heatmap
 * Tracks shelter health symptoms and triggers Red Alerts when disease outbreak thresholds are breached.
 */
class EpidemicSurveillanceService {
  static logShelterSymptomReport({ shelter_id, diarrhea_cases, fever_cases, cholera_risk_flag }) {
    const totalCases = diarrhea_cases + fever_cases;
    const isOutbreakAlert = totalCases >= 5 || cholera_risk_flag;

    const report = {
      shelter_id,
      diarrhea_cases,
      fever_cases,
      total_symptomatic_cases: totalCases,
      outbreak_alert_level: isOutbreakAlert ? "RED_ALERT_OUTBREAK_RISK" : "NORMAL_MONITORING",
      action_required: isOutbreakAlert ? "DISPATCH_WASH_PURIFICATION_AND_DOCTORS" : "ROUTINE_HYGIENE",
      timestamp: new Date().toISOString()
    };

    console.log(`☣️ [Epidemic Surveillance] Shelter ${shelter_id} Symptom Report logged (Cases: ${totalCases}). Alert: ${report.outbreak_alert_level}`);
    return report;
  }
}

module.exports = EpidemicSurveillanceService;
