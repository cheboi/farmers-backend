const express = require("express");
const router = express.Router();
const {
  registerFarmer,
  getAllFarmers,
  updateFarmerStatus,
  getMyStatus,
  getFarmerById,
  revokeFarmerCertificate,
} = require("../controllers/farmer.controller");

const { registerFarmerLimiter } = require("../middleware/rateLimiters");

router.post("/", registerFarmerLimiter, registerFarmer);

const authenticate = require("../middlewares/auth.middleware");
const authorizeRole = require("../middlewares/role.middleware");

router.get("/", authenticate, authorizeRole("admin"), getAllFarmers);
router.get("/me", authenticate, getMyStatus);
router.get("/:id", authenticate, authorizeRole("admin"), getFarmerById);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRole("admin"),
  updateFarmerStatus
);
router.patch(
  "/:id/revoke",
  authenticate,
  authorizeRole("admin"),
  revokeFarmerCertificate
);

module.exports = router;
