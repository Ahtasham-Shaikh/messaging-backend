const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middlewares/auth");

const router = express.Router();

// Get User Contacts API
// Returns up to 10 users (excluding the currently authenticated user)
router.get("/contacts", authenticateToken, async (req, res) => {
  console.log("trying get contacts");
  try {
    const userId = req.user.id; // Extracted from the validated JWT token payload

    // Query the database for other users
    const [users] = await db.execute(
      "SELECT id, username FROM users WHERE id != ? LIMIT 10",
      [userId],
    );

    res.json({ contacts: users });
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
