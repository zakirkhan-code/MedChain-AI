const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const patientController = require("../controllers/patient.controller");

router.get("/me", protect, authorize("patient"), asyncHandler(patientController.getMyProfile));
router.put("/emergency-info", protect, authorize("patient"), asyncHandler(patientController.updateEmergencyInfo));

// On-chain confirmation routes
router.post("/confirm-onchain", protect, authorize("patient"), asyncHandler(async (req, res) => {
  const { txHash } = req.body;
  if (!txHash) return res.status(400).json({ success: false, message: "txHash required" });

  const User = require("../models/User");
  const user = await User.findById(req.user._id);
  user.onChainStatus = 1;
  if (!user.txHashes) user.txHashes = [];
  user.txHashes.push(txHash);
  await user.save();

  res.json({ success: true, message: "On-chain registration confirmed", data: { onChainStatus: 1 } });
}));

router.post("/confirm-consent", protect, authorize("patient"), asyncHandler(async (req, res) => {
  const { txHash } = req.body;
  if (!txHash) return res.status(400).json({ success: false, message: "txHash required" });

  const User = require("../models/User");
  const user = await User.findById(req.user._id);
  user.onChainStatus = 4;
  if (!user.txHashes) user.txHashes = [];
  user.txHashes.push(txHash);
  await user.save();

  res.json({ success: true, message: "Consent confirmed - patient active", data: { onChainStatus: 4 } });
}));

module.exports = router;