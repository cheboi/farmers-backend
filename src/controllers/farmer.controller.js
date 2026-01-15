const logger = require("../utils/logger");
const pool = require("../config/db");
const { hashPassword } = require("../utils/password");
const validateFarmerRegistration = require("../validations/farmer.validation");
const { stack } = require("../app");

async function registerFarmer(req, res) {
  const client = await pool.connect();

  try {
    const error = validateFarmerRegistration(req.body);
    if (error) {
      logger.warn("Invalid farmer registration payload", {
        error,
        payload: req.body,
      });
      return res.status(400).json({ message: error });
    }

    const {
      username,
      password,
      firstName,
      lastName,
      farmSize,
      cropType,
      livestockType,
    } = req.body;

    await client.query("BEGIN");

    const passwordHash = await hashPassword(password);

    const userResult = await client.query(
      `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, 'farmer')
      RETURNING id
      `,
      [username, passwordHash]
    );

    const userId = userResult.rows[0].id;

    await client.query(
      `
      INSERT INTO farmers (
        user_id, first_name, last_name, farm_size, crop_type, livestock_type
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        userId,
        firstName,
        lastName,
        farmSize,
        cropType || null,
        livestockType || null,
      ]
    );

    await client.query("COMMIT");

    logger.info("Farmer registered successfully", {
      userId,
      username,
    });

    res.status(201).json({
      message: "Farmer registered successfully. Awaiting certification.",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      logger.warn("Duplicate username registration attempt", {
        username: req.body.username,
      });

      return res.status(409).json({
        message: "Username already exists",
      });
    }

    logger.error("Failed to register farmer", {
      error: error.message,
      stack: error.stack,
      payload: req.body,
    });

    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

async function getAllFarmers(req, res) {
  try {
    // Role-based access control
    if (req.user.role !== "admin") {
      logger.warn("Unauthorized farmers list access attempt", {
        userId: req.user.id,
        role: req.user.role,
      });

      return res.status(403).json({
        message: "Access denied",
      });
    }

    const result = await pool.query(`
      SELECT
        f.id,
        f.first_name,
        f.last_name,
        f.farm_size,
        f.crop_type,
        f.livestock_type,
        f.status,
        f.created_at,
        u.username
      FROM farmers f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);

    logger.info("Fetched all farmers", {
      count: result.rowCount,
      requestedBy: req.user.id,
    });

    res.json(result.rows);
  } catch (error) {
    logger.error("Failed to fetch farmers", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({ message: "Server error" });
  }
}

async function updateFarmerStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  // Admin only
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  // ❗ revoke handled separately
  const allowed = ["pending", "certified", "declined"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT status FROM farmers WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Farmer not found" });
    }

    await client.query("UPDATE farmers SET status = $1 WHERE id = $2", [
      status,
      id,
    ]);

    await client.query("COMMIT");

    logger.info("Farmer status updated", {
      farmerId: id,
      newStatus: status,
      updatedBy: req.user.id,
    });

    res.json({ message: `Farmer status updated to ${status}` });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to update farmer status", { error: error.message });

    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

async function getMyStatus(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        first_name,
        last_name,
        farm_size,
        crop_type,
        livestock_type,
        status,
        revoke_reason,
        revoked_at
      FROM farmers
      WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Farmer profile not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Failed to fetch farmer status", {
      userId: req.user.id,
      error: error.message,
    });

    res.status(500).json({ message: "Server error" });
  }
}

async function getFarmerById(req, res) {
  try {
    const { id } = req.params;

    // ADMIN only
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await pool.query(
      `SELECT
        id,
        first_name,
        last_name,
        farm_size,
        crop_type,
        livestock_type,
        status,
        revoke_reason,
        revoked_at,
        created_at
      FROM farmers
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logger.error("Failed to fetch farmer by ID", {
      farmerId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ message: "Server error" });
  }
}

async function revokeFarmerCertificate(req, res) {
  const client = await pool.connect();

  try {
    const farmerId = req.params.id;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        message: "Revocation reason is required",
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      "SELECT status FROM farmers WHERE id = $1",
      [farmerId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Farmer not found" });
    }

    if (result.rows[0].status !== "certified") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Only certified farmers can be revoked",
      });
    }

    await client.query(
      `
      UPDATE farmers
      SET status = 'revoked',
          revoke_reason = $1,
          revoked_at = NOW()
      WHERE id = $2
      `,
      [reason, farmerId]
    );
    logger.info("Farmer certificate revoked", {
      farmerId,
      revokedBY: req.user.id,
      reason,
    });
    await client.query("COMMIT");

    res.json({
      message: "Farmer certificate revoked successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    logger.error("Error revoking farmer certificate", {
      farmerId: req.params.id,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      message: "Server error while revoking certificate",
    });
  } finally {
    client.release();
  }
}

module.exports = {
  registerFarmer,
  getAllFarmers,
  updateFarmerStatus,
  getMyStatus,
  getFarmerById,
  revokeFarmerCertificate,
};
