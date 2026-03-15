const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const config = require("../config");
const db = require("../config/db");
const authenticateToken = require("../middlewares/auth");

const router = express.Router();

// Register route to create a new user
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    // Check if the user already exists
    const [existingUsers] = await db.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Username already exists" });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    const [result] = await db.execute(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
    );

    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login route to generate a JWT token
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    // Authenticate the user against the database
    const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const dbUser = rows[0];

    // Verify password using bcrypt
    const isMatch = await bcrypt.compare(password, dbUser.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Prepare payload
    const user = { id: dbUser.id, name: dbUser.username };

    // Sign a new token that expires in 1 hour
    const accessToken = jwt.sign(user, config.jwtSecret, { expiresIn: "1h" });

    res.json({ accessToken });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Example of a protected HTTP route
router.get("/protected", authenticateToken, (req, res) => {
  res.json({
    message: `Hello ${req.user.name}, you have access to this protected route!`,
  });
});

module.exports = router;
