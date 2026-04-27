const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const {
  listClients,
  createClient,
  addPoints,
  getClientHistory,
  deleteClient,
  exportClientsCsv,
  previewImport,
  commitImport
} = require("../controllers/clientController");

const router = Router();

router.use(authMiddleware);
router.get("/export.csv", exportClientsCsv);
router.post("/import/preview", previewImport);
router.post("/import/commit", commitImport);
router.get("/", listClients);
router.post("/", createClient);
router.post("/:clientId/points", addPoints);
router.get("/:clientId/history", getClientHistory);
router.delete("/:clientId", deleteClient);

module.exports = router;
