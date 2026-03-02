const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return res.status(401).json({ success: false, message: "Not authorized, no token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ success: false, message: "User not found" });
    if (!req.user.isActive) return res.status(401).json({ success: false, message: "Account deactivated" });

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Role ${req.user.role} not authorized` });
    }
    next();
  };
};

const verifyWalletSignature = async (req, res, next) => {
  try {
    const { message, signature, walletAddress } = req.body;
    if (!message || !signature || !walletAddress) {
      return res.status(400).json({ success: false, message: "Missing wallet verification fields" });
    }

    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ success: false, message: "Invalid wallet signature" });
    }

    req.verifiedWallet = recoveredAddress.toLowerCase();
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Wallet verification failed" });
  }
};

module.exports = { protect, authorize, verifyWalletSignature };
