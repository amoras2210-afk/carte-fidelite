const { Router } = require("express");
const { getPublicCard } = require("../controllers/publicController");

const router = Router();

// Public endpoint (no auth): requires a signed token.
router.get("/card", getPublicCard);

module.exports = router;

