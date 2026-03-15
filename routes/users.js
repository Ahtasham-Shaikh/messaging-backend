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

// Get Chat History API
// Returns the 15 latest messages between the current user and a selected contact
router.get("/chat/:username", authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const contactUsername = req.params.username;

    // 1. Get contact ID from username
    const [contactRows] = await db.execute(
      "SELECT id FROM users WHERE username = ?",
      [contactUsername]
    );

    if (contactRows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }

    const contactId = contactRows[0].id;

    // 2. Fetch last 15 messages between these two users
    const [messages] = await db.execute(
      `SELECT m.*, u.username as sender_name 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE (m.sender_id = ? AND m.receiver_id = ?) 
          OR (m.sender_id = ? AND m.receiver_id = ?) 
       ORDER BY m.created_at DESC 
       LIMIT 15`,
      [currentUserId, contactId, contactId, currentUserId]
    );

    // Return in chronological order (oldest first)
    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
