const { Router } = require("express");
const { getPublicCard } = require("../controllers/publicController");
const { updateMerchantCardDesignFromToken } = require("../controllers/merchantCardDesignController");
const { sendPublicCardLink } = require("../controllers/sendPublicCardLinkController");

const router = Router();

// Public endpoint (no auth): requires a signed token.
router.get("/card", getPublicCard);

// Public endpoint (no auth): requires a signed design token from the merchant.
router.post("/merchant/card-design", updateMerchantCardDesignFromToken);

// Public endpoint (no auth): JWT carte client → envoi du lien par e-mail au client.
router.post("/send-card-link", sendPublicCardLink);

module.exports = router;

