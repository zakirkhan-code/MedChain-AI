import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.10.3:5000/api"; // Android emulator
// const BASE_URL = "http://localhost:5000/api"; // iOS simulator
// const BASE_URL = "http://YOUR_IP:5000/api"; // Physical device

const API = axios.create({ baseURL: BASE_URL, timeout: 15000 });

API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(["token", "user"]);
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => API.post("/auth/register", data),
  login: (data) => API.post("/auth/login", data),
  walletLogin: (data) => API.post("/auth/wallet-login", data),
  connectWallet: (data) => API.post("/auth/connect-wallet", data),
  getProfile: () => API.get("/auth/profile"),
  updateProfile: (data) => API.put("/auth/profile", data),
  changePassword: (data) => API.put("/auth/change-password", data),
};

export const patientAPI = {
  getMyProfile: () => API.get("/patients/me"),
  submitRegistration: (data) => API.post("/patients/register-onchain", data),
  updateEmergencyInfo: (data) => API.put("/patients/emergency-info", data),
};

export const doctorAPI = {
  getMyProfile: () => API.get("/doctors/me"),
  submitApplication: (data) => API.post("/doctors/apply", data),
  list: (params) => API.get("/doctors/list", { params }),
  getById: (id) => API.get(`/doctors/${id}`),
  rate: (id, rating) => API.post(`/doctors/${id}/rate`, { rating }),
};

export const recordAPI = {
  create: (data) => API.post("/records", data),
  getMyRecords: (params) => API.get("/records/my-records", { params }),
  getById: (id) => API.get(`/records/${id}`),
  amend: (id, data) => API.put(`/records/${id}/amend`, data),
  archive: (id) => API.put(`/records/${id}/archive`),
  verify: (id) => API.get(`/records/${id}/verify`),
};

export const accessAPI = {
  grant: (data) => API.post("/access/grant", data),
  revoke: (data) => API.post("/access/revoke", data),
  request: (data) => API.post("/access/request", data),
  approve: (data) => API.post("/access/approve", data),
  reject: (data) => API.post("/access/reject", data),
  getPermissions: (params) => API.get("/access/permissions", { params }),
};

export const aiAPI = {
  symptomCheck: (data) => API.post("/ai/symptom-check", data),
  summarizeReport: (data) => API.post("/ai/summarize-report", data),
  drugInteraction: (data) => API.post("/ai/drug-interaction", data),
  healthInsights: (data) => API.post("/ai/health-insights", data),
  chat: (data) => API.post("/ai/chat", data),
  getHistory: (params) => API.get("/ai/history", { params }),
};

export const notificationAPI = {
  getAll: (params) => API.get("/notifications", { params }),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put("/notifications/read-all"),
};

export default API;
