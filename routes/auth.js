const express = require("express");
const jwt = require("jsonwebtoken");
const config = require("../config");
const authenticateToken = require("../middlewares/auth");

const router = express.Router();

// Login route to generate a JWT token
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  // In a real application, you would authenticate the user against a database here.
  // We're using a mock user object for demonstration purposes.
  const user = { name: username };

  // Sign a new token that expires in 1 hour
  const accessToken = jwt.sign(user, config.jwtSecret, { expiresIn: "1h" });

  res.json({ accessToken });
});

// Example of a protected HTTP route
router.get("/protected", authenticateToken, (req, res) => {
  res.json({
    message: `Hello ${req.user.name}, you have access to this protected route!`,
  });
});

module.exports = router;
