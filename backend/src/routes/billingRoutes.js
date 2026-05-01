const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const { getBillingStatus, createCheckoutSession } = require("../controllers/billingController");

const router = Router();

router.use(authMiddleware);
router.get("/status", getBillingStatus);
router.post("/checkout-session", createCheckoutSession);

module.exports = router;
