const { Router } = require("express");
const { getPublicCard } = require("../controllers/publicController");
const { updateMerchantCardDesignFromToken } = require("../controllers/merchantCardDesignController");

const router = Router();

// Public endpoint (no auth): requires a signed token.
router.get("/card", getPublicCard);

// Public endpoint (no auth): requires a signed design token from the merchant.
router.post("/merchant/card-design", updateMerchantCardDesignFromToken);

module.exports = router;

