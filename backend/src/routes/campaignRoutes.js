const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const { listCampaigns, createCampaign, sendCampaign } = require("../controllers/campaignController");

const router = Router();

router.use(authMiddleware);
router.get("/", listCampaigns);
router.post("/", createCampaign);
router.post("/:campaignId/send", sendCampaign);

module.exports = router;
