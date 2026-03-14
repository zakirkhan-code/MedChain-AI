const axios = require("axios");

let firebaseInitialized = false;
let accessToken = null;
let tokenExpiry = 0;

const getAccessToken = async () => {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  try {
    const jwt = require("jsonwebtoken");
    const now = Math.floor(Date.now() / 1000);
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.warn("Firebase credentials not configured");
      return null;
    }

    const token = jwt.sign(
      {
        iss: process.env.FIREBASE_CLIENT_EMAIL,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      },
      privateKey,
      { algorithm: "RS256" },
    );

    const res = await axios.post("https://oauth2.googleapis.com/token", {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    });

    accessToken = res.data.access_token;
    tokenExpiry = Date.now() + 3500000;
    firebaseInitialized = true;
    return accessToken;
  } catch (error) {
    console.error("Firebase auth error:", error.message);
    return null;
  }
};

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const token = await getAccessToken();
    if (!token) return { success: false, message: "Firebase not configured" };

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const res = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        message: {
          token: fcmToken,
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
          ),
          android: {
            priority: "high",
            notification: { sound: "default", channel_id: "medchain" },
          },
          apns: { payload: { aps: { sound: "default", badge: 1 } } },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return { success: true, messageId: res.data.name };
  } catch (error) {
    console.error(
      "Push notification error:",
      error.response?.data || error.message,
    );
    return { success: false, message: error.message };
  }
};

const sendToMultiple = async (fcmTokens, title, body, data = {}) => {
  const results = await Promise.allSettled(
    fcmTokens.map((token) => sendPushNotification(token, title, body, data)),
  );
  return results.map((r, i) => ({
    token: fcmTokens[i],
    ...(r.status === "fulfilled"
      ? r.value
      : { success: false, message: r.reason?.message }),
  }));
};

const NOTIFICATION_TEMPLATES = {
  ACCESS_REQUEST: (doctorName) => ({
    title: "New Access Request",
    body: `Dr. ${doctorName} is requesting access to your medical records`,
  }),
  ACCESS_GRANTED: (patientName, level) => ({
    title: "Access Granted",
    body: `${patientName} granted you ${level} access to their records`,
  }),
  ACCESS_REVOKED: (patientName) => ({
    title: "Access Revoked",
    body: `${patientName} revoked your access to their records`,
  }),
  DOCTOR_VERIFIED: () => ({
    title: "Credentials Verified! ",
    body: "Your medical credentials have been verified. You now have full platform access.",
  }),
  DOCTOR_REJECTED: (reason) => ({
    title: "Verification Rejected",
    body: `Your credentials were rejected: ${reason}`,
  }),
  PATIENT_APPROVED: () => ({
    title: "Registration Approved! ",
    body: "Your registration has been approved. Please give consent to activate your account.",
  }),
  RECORD_ADDED: (title) => ({
    title: "New Medical Record",
    body: `A new record "${title}" has been added to your profile`,
  }),
  APPOINTMENT_REMINDER: (doctorName, time) => ({
    title: "Appointment Reminder",
    body: `You have an appointment with Dr. ${doctorName} at ${time}`,
  }),
};

module.exports = {
  sendPushNotification,
  sendToMultiple,
  NOTIFICATION_TEMPLATES,
  getAccessToken,
};
