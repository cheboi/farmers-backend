const pool = require("../config/db");
const { hashPassword } = require("../utils/password");
const validateFarmerRegistration = require("../validations/farmer.validation");

async function registerFarmer(req, res) {
  const client = await pool.connect();

  try {
    // Validating input
    const error = validateFarmerRegistration(req.body);
    if (error) {
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

    // Start transaction
    await client.query("BEGIN");

    // Hashing password
    const passwordHash = await hashPassword(password);

    // Insert into users table
    const userResult = await client.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'farmer')
       RETURNING id`,
      [username, passwordHash]
    );

    const userId = userResult.rows[0].id;

    // Insert into farmers table
    await client.query(
      `INSERT INTO farmers (
        user_id, first_name, last_name, farm_size, crop_type, livestock_type
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        firstName,
        lastName,
        farmSize,
        cropType || null,
        livestockType || null,
      ]
    );

    // Commit transaction
    await client.query("COMMIT");

    res.status(201).json({
      message: "Farmer registered successfully. Awaiting certification.",
    });
  } catch (error) {
    // Rollback transaction if any error occurs
    await client.query("ROLLBACK");

    // Username already exists
    if (error.code === "23505") {
      return res.status(409).json({ message: "Username already exists" });
    }

    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
}

async function getAllFarmers(req, res) {
  try {
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

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

async function updateFarmerStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "certified", "declined", "revoked"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  await pool.query("UPDATE farmers SET status=$1 WHERE id=$2", [status, id]);

  res.json({ message: `Farmer status updated to ${status}` });
}

async function getMyStatus(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        first_name,
        last_name,
        farm_size,
        crop_type,
        livestock_type,
        status
      FROM farmers
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Farmer profile not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

async function getFarmerById(req, res) {
  try {
    const { id } = req.params;

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
    console.error(err);
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

    await client.query("COMMIT");

    res.json({
      message: "Farmer certificate revoked successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("REVOKE ERROR:", error.message);

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
