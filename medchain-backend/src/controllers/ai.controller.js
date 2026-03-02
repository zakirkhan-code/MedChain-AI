const AIInteraction = require("../models/AIInteraction");
const { asyncHandler } = require("../middleware/errorHandler");
const { symptomCheck, summarizeReport, checkDrugInteractions, healthInsights, medicalChat } = require("../services/ai.service");

exports.analyzeSymptoms = asyncHandler(async (req, res) => {
  const { symptoms, age } = req.body;
  if (!symptoms) return res.status(400).json({ success: false, message: "Provide symptoms" });

  const patientInfo = { bloodType: req.user.bloodType, allergies: req.user.allergies, age };
  const result = await symptomCheck(symptoms, patientInfo);

  let parsed;
  try { parsed = JSON.parse(result.content); } catch { parsed = { rawResponse: result.content }; }

  await AIInteraction.create({
    user: req.user._id, type: "symptom-check", query: symptoms,
    response: result.content, context: patientInfo,
    tokensUsed: result.tokensUsed, model: result.model,
  });

  res.json({ success: true, data: { analysis: parsed, tokensUsed: result.tokensUsed } });
});

exports.summarizeMedicalReport = asyncHandler(async (req, res) => {
  const { reportText, recordType } = req.body;
  if (!reportText) return res.status(400).json({ success: false, message: "Provide report text" });

  const result = await summarizeReport(reportText, recordType);

  let parsed;
  try { parsed = JSON.parse(result.content); } catch { parsed = { rawResponse: result.content }; }

  await AIInteraction.create({
    user: req.user._id, type: "report-summary", query: reportText.substring(0, 500),
    response: result.content, tokensUsed: result.tokensUsed, model: result.model,
    relatedRecord: req.body.recordId,
  });

  res.json({ success: true, data: { summary: parsed, tokensUsed: result.tokensUsed } });
});

exports.checkDrugInteraction = asyncHandler(async (req, res) => {
  const { medications } = req.body;
  if (!medications || !Array.isArray(medications) || medications.length < 2) {
    return res.status(400).json({ success: false, message: "Provide at least 2 medications" });
  }

  const result = await checkDrugInteractions(medications);

  let parsed;
  try { parsed = JSON.parse(result.content); } catch { parsed = { rawResponse: result.content }; }

  await AIInteraction.create({
    user: req.user._id, type: "drug-interaction", query: medications.join(", "),
    response: result.content, tokensUsed: result.tokensUsed, model: result.model,
  });

  res.json({ success: true, data: { interactions: parsed, tokensUsed: result.tokensUsed } });
});

exports.getHealthInsights = asyncHandler(async (req, res) => {
  const patientData = {
    bloodType: req.user.bloodType,
    allergies: req.user.allergies,
    totalRecords: req.user.totalRecords,
    ...req.body.healthData,
  };

  const result = await healthInsights(patientData);

  let parsed;
  try { parsed = JSON.parse(result.content); } catch { parsed = { rawResponse: result.content }; }

  await AIInteraction.create({
    user: req.user._id, type: "health-insight", query: JSON.stringify(patientData).substring(0, 500),
    response: result.content, tokensUsed: result.tokensUsed, model: result.model,
  });

  res.json({ success: true, data: { insights: parsed, tokensUsed: result.tokensUsed } });
});

exports.chat = asyncHandler(async (req, res) => {
  const { message, conversationHistory } = req.body;
  if (!message) return res.status(400).json({ success: false, message: "Provide message" });

  const result = await medicalChat(message, conversationHistory || []);

  await AIInteraction.create({
    user: req.user._id, type: "chat", query: message,
    response: result.content, tokensUsed: result.tokensUsed, model: result.model,
  });

  res.json({ success: true, data: { reply: result.content, tokensUsed: result.tokensUsed } });
});

exports.getMyAIHistory = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const filter = { user: req.user._id };
  if (type) filter.type = type;

  const interactions = await AIInteraction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  const total = await AIInteraction.countDocuments(filter);

  res.json({ success: true, data: { interactions, total, page: Number(page), pages: Math.ceil(total / limit) } });
});
