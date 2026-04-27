const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const { trackEvent, linkSession } = require("../controllers/onboardingController");

const router = Router();

router.post("/events", trackEvent);
router.post("/link-session", authMiddleware, linkSession);

module.exports = router;
