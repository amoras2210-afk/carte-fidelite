const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const { getSettings, updateSettings } = require("../controllers/settingsController");

const router = Router();

router.use(authMiddleware);
router.get("/", getSettings);
router.put("/", updateSettings);

module.exports = router;
