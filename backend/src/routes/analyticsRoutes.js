const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const { getOverview, getOnboardingFunnel, getBusiness } = require("../controllers/analyticsController");

const router = Router();

router.use(authMiddleware);
router.get("/overview", getOverview);
router.get("/onboarding-funnel", getOnboardingFunnel);
router.get("/business", getBusiness);

module.exports = router;
