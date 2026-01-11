const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/auth.middleware");
const authorizeRole = require("../middlewares/role.middleware");

const {
  registerFarmer,
  getAllFarmers,
  updateFarmerStatus,
  getMyStatus,
} = require("../controllers/farmer.controller");

router.post("/", registerFarmer);

router.get("/", authenticate, authorizeRole("admin"), getAllFarmers);
router.get("/me", authenticate, getMyStatus);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRole("admin"),
  updateFarmerStatus
);

module.exports = router;
