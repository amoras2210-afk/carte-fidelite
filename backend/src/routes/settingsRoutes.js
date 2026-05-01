const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const subscriptionGuard = require("../middleware/subscriptionGuard");
const { getSettings, updateSettings } = require("../controllers/settingsController");
const {
  getGoogleConnectUrl,
  googleOAuthCallback,
  disconnectGoogleMail
} = require("../controllers/googleMailController");

const router = Router();

router.get("/google/callback", googleOAuthCallback);

router.use(authMiddleware);
router.use(subscriptionGuard);
router.get("/", getSettings);
router.put("/", updateSettings);
router.get("/google/connect-url", getGoogleConnectUrl);
router.post("/google/disconnect", disconnectGoogleMail);

module.exports = router;
