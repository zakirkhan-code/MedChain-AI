const router = require("express").Router();
const { analyzeSymptoms, summarizeMedicalReport, checkDrugInteraction, getHealthInsights, chat, getMyAIHistory } = require("../controllers/ai.controller");
const { protect } = require("../middleware/auth");

router.post("/symptom-check", protect, analyzeSymptoms);
router.post("/summarize-report", protect, summarizeMedicalReport);
router.post("/drug-interaction", protect, checkDrugInteraction);
router.post("/health-insights", protect, getHealthInsights);
router.post("/chat", protect, chat);
router.get("/history", protect, getMyAIHistory);

module.exports = router;
