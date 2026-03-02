const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { getUserNotifications, markAsRead, markAllAsRead } = require("../services/notification.service");

router.get("/", protect, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await getUserNotifications(req.user._id, Number(page), Number(limit));
  res.json({ success: true, data: result });
}));

router.put("/:id/read", protect, asyncHandler(async (req, res) => {
  const notification = await markAsRead(req.params.id, req.user._id);
  if (!notification) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: notification });
}));

router.put("/read-all", protect, asyncHandler(async (req, res) => {
  await markAllAsRead(req.user._id);
  res.json({ success: true, message: "All notifications marked as read" });
}));

module.exports = router;
