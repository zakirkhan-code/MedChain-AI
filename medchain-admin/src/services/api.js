import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => API.post("/auth/login", data),
  register: (data) => API.post("/auth/register", data),
  getProfile: () => API.get("/auth/profile"),
};

export const adminAPI = {
  getDashboard: () => API.get("/admin/dashboard"),
  getUsers: (params) => API.get("/admin/users", { params }),
  verifyDoctor: (id) => API.put(`/admin/verify-doctor/${id}`),
  rejectDoctor: (id, data) => API.put(`/admin/reject-doctor/${id}`, data),
  suspendDoctor: (id, data) => API.put(`/admin/suspend-doctor/${id}`, data),
  approvePatient: (id) => API.put(`/admin/approve-patient/${id}`),
  rejectPatient: (id, data) => API.put(`/admin/reject-patient/${id}`, data),
  getAuditLogs: (params) => API.get("/admin/audit-logs", { params }),
  getAIAnalytics: () => API.get("/admin/ai-analytics"),
};

export const doctorAPI = {
  list: (params) => API.get("/doctors/list", { params }),
  getById: (id) => API.get(`/doctors/${id}`),
};

export const patientAPI = {
  getById: (id) => API.get(`/patients/${id}`),
};

export const recordAPI = {
  getPatientRecords: (id, params) => API.get(`/records/patient/${id}`, { params }),
  verify: (id) => API.get(`/records/${id}/verify`),
};

export const accessAPI = {
  getAudit: (params) => API.get("/access/audit", { params }),
  getPermissions: (params) => API.get("/access/permissions", { params }),
};

export default API;
