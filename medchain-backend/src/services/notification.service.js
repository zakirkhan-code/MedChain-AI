const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendPushNotification, NOTIFICATION_TEMPLATES } = require("./firebase.service");

const createNotification = async (userId, type, title, message, data = {}) => {
  const notification = await Notification.create({ user: userId, type, title, message, data });

  try {
    const user = await User.findById(userId).select("fcmToken");
    if (user?.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, { type, notificationId: notification._id.toString(), ...data });
    }
  } catch (err) {
    console.error("Push notification failed:", err.message);
  }

  return notification;
};

const getUserNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await Notification.countDocuments({ user: userId });
  const unread = await Notification.countDocuments({ user: userId, read: false });
  return { notifications, total, unread, page, pages: Math.ceil(total / limit) };
};

const markAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
};

const markAllAsRead = async (userId) => {
  return await Notification.updateMany({ user: userId, read: false }, { read: true, readAt: new Date() });
};

const notifyAccessRequest = async (patientId, doctorName, data) => {
  const tmpl = NOTIFICATION_TEMPLATES.ACCESS_REQUEST(doctorName);
  return createNotification(patientId, "access_request", tmpl.title, tmpl.body, data);
};

const notifyAccessGranted = async (doctorId, patientName, level, data) => {
  const tmpl = NOTIFICATION_TEMPLATES.ACCESS_GRANTED(patientName, level);
  return createNotification(doctorId, "access_granted", tmpl.title, tmpl.body, data);
};

const notifyDoctorVerified = async (doctorId) => {
  const tmpl = NOTIFICATION_TEMPLATES.DOCTOR_VERIFIED();
  return createNotification(doctorId, "verification", tmpl.title, tmpl.body);
};

const notifyDoctorRejected = async (doctorId, reason) => {
  const tmpl = NOTIFICATION_TEMPLATES.DOCTOR_REJECTED(reason);
  return createNotification(doctorId, "verification", tmpl.title, tmpl.body);
};

const notifyPatientApproved = async (patientId) => {
  const tmpl = NOTIFICATION_TEMPLATES.PATIENT_APPROVED();
  return createNotification(patientId, "verification", tmpl.title, tmpl.body);
};

const notifyRecordAdded = async (patientId, recordTitle, data) => {
  const tmpl = NOTIFICATION_TEMPLATES.RECORD_ADDED(recordTitle);
  return createNotification(patientId, "record_added", tmpl.title, tmpl.body, data);
};

module.exports = {
  createNotification, getUserNotifications, markAsRead, markAllAsRead,
  notifyAccessRequest, notifyAccessGranted,
  notifyDoctorVerified, notifyDoctorRejected,
  notifyPatientApproved, notifyRecordAdded,
};
