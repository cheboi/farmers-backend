const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { comparePassword } = require("../utils/password");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/jwt");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const result = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = $1",
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generated JWT
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    console.log("JWT TOKEN:", token);
    res.json({
      token,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
