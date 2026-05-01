const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const subscriptionGuard = require("../middleware/subscriptionGuard");
const {
  listClients,
  createClient,
  addPoints,
  getClientHistory,
  deleteClient,
  exportClientsCsv,
  previewImport,
  commitImport,
  createClientCardToken
} = require("../controllers/clientController");

const router = Router();

router.use(authMiddleware);
router.use(subscriptionGuard);
router.get("/export.csv", exportClientsCsv);
router.post("/import/preview", previewImport);
router.post("/import/commit", commitImport);
router.get("/", listClients);
router.post("/", createClient);
router.post("/:clientId/points", addPoints);
router.post("/:clientId/card-token", createClientCardToken);
router.get("/:clientId/history", getClientHistory);
router.delete("/:clientId", deleteClient);

module.exports = router;
