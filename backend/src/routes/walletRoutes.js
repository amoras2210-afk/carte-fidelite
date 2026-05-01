const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const {
  generateAppleWalletPass,
  getGoogleWalletPayload,
  walletDiagnostics
} = require("../controllers/walletController");

const router = Router();

router.use(authMiddleware);
router.get("/diagnostics", walletDiagnostics);
router.get("/apple/:clientId", generateAppleWalletPass);
router.get("/google/:clientId", getGoogleWalletPayload);

module.exports = router;
