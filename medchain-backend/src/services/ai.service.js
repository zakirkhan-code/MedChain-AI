const axios = require("axios");

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const callOpenAI = async (messages, maxTokens = 1000) => {
  const response = await axios.post(OPENAI_URL, {
    model: process.env.OPENAI_MODEL || "gpt-4",
    messages,
    max_tokens: maxTokens,
    temperature: 0.3,
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  return {
    content: response.data.choices[0].message.content,
    tokensUsed: response.data.usage.total_tokens,
    model: response.data.model,
  };
};

const symptomCheck = async (symptoms, patientInfo = {}) => {
  const messages = [
    {
      role: "system",
      content: `You are a medical AI assistant for the MedChain AI healthcare platform. Analyze patient symptoms and provide possible conditions, severity assessment, and recommendations. Always include a disclaimer that this is not a substitute for professional medical advice. Format response as JSON with fields: possibleConditions (array of {name, probability, severity}), overallSeverity (low/medium/high/critical), recommendations (array of strings), shouldSeekImmediateCare (boolean), disclaimer (string).`,
    },
    {
      role: "user",
      content: `Patient symptoms: ${symptoms}\n${patientInfo.bloodType ? `Blood Type: ${patientInfo.bloodType}` : ""}\n${patientInfo.allergies ? `Known Allergies: ${patientInfo.allergies}` : ""}\n${patientInfo.age ? `Age: ${patientInfo.age}` : ""}`,
    },
  ];
  return callOpenAI(messages, 1500);
};

const summarizeReport = async (reportText, recordType = "general") => {
  const messages = [
    {
      role: "system",
      content: `You are a medical AI that summarizes medical reports into patient-friendly language. Highlight key findings, abnormal values, and what they mean in simple terms. Format as JSON: {summary, keyFindings (array), abnormalValues (array of {name, value, normalRange, significance}), plainExplanation, recommendedFollowUp (array)}.`,
    },
    {
      role: "user",
      content: `Summarize this ${recordType} report:\n\n${reportText}`,
    },
  ];
  return callOpenAI(messages, 2000);
};

const checkDrugInteractions = async (medications) => {
  const messages = [
    {
      role: "system",
      content: `You are a pharmacology AI assistant. Check for drug interactions between the given medications. Format response as JSON: {interactions (array of {drug1, drug2, severity, description, recommendation}), overallRisk (low/moderate/high/critical), safeToTakeTogether (boolean), alternatives (array of {original, suggestion, reason}), disclaimer}.`,
    },
    {
      role: "user",
      content: `Check interactions between these medications: ${medications.join(", ")}`,
    },
  ];
  return callOpenAI(messages, 1500);
};

const healthInsights = async (patientData) => {
  const messages = [
    {
      role: "system",
      content: `You are a health analytics AI. Analyze patient health data and provide personalized wellness recommendations. Format as JSON: {healthScore (0-100), insights (array of {category, finding, recommendation}), riskFactors (array), positiveIndicators (array), lifestyleRecommendations (array), nextCheckupRecommendations (array)}.`,
    },
    {
      role: "user",
      content: `Analyze this patient data:\n${JSON.stringify(patientData, null, 2)}`,
    },
  ];
  return callOpenAI(messages, 1500);
};

const medicalChat = async (message, conversationHistory = []) => {
  const messages = [
    {
      role: "system",
      content: `You are a helpful medical AI chatbot for MedChain AI. Answer health questions accurately and helpfully. For serious symptoms, always recommend consulting a healthcare professional. Never diagnose conditions definitively. Be empathetic and clear. Always end with a brief disclaimer.`,
    },
    ...conversationHistory,
    { role: "user", content: message },
  ];
  return callOpenAI(messages, 1000);
};

module.exports = { callOpenAI, symptomCheck, summarizeReport, checkDrugInteractions, healthInsights, medicalChat };
