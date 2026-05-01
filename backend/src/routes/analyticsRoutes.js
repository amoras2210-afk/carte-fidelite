const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const subscriptionGuard = require("../middleware/subscriptionGuard");
const { getOverview, getOnboardingFunnel, getBusiness } = require("../controllers/analyticsController");

const router = Router();

router.use(authMiddleware);
router.use(subscriptionGuard);
router.get("/overview", getOverview);
router.get("/onboarding-funnel", getOnboardingFunnel);
router.get("/business", getBusiness);

module.exports = router;
