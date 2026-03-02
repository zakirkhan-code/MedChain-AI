const router = require("express").Router();
const { register, login, walletLogin, connectWallet, getProfile, updateProfile, changePassword } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/wallet-login", walletLogin);
router.post("/connect-wallet", protect, connectWallet);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;
