const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middlewares/auth");
const onlineUsers = require("../websockets/onlineUsers");

const router = express.Router();

// Get User Contacts API
// Returns up to 10 users (excluding the currently authenticated user)
router.get("/contacts", authenticateToken, async (req, res) => {
  console.log("trying get contacts");
  try {
    const userId = req.user.id;
    const { usernames } = req.query; // Expecting ?usernames[]=user1&usernames[]=user2

    let users;

    if (usernames && Array.isArray(usernames) && usernames.length > 0) {
      // 1. Fetch specific users by username array
      const [rows] = await db.execute(
        `SELECT id, username, last_seen FROM users WHERE username IN (${usernames.map(() => "?").join(",")})`,
        usernames
      );

      // Map the results back to the original order and include nulls for missing users
      users = usernames.map((name) => {
        const found = rows.find((u) => u.username === name);
        return found || { username: name, id: null, last_seen: null, not_found: true };
      });
    } else {
      // 2. Fetch 10 random users if no array is provided (excluding self)
      [users] = await db.execute(
        "SELECT id, username, last_seen FROM users WHERE id != ? ORDER BY RAND() LIMIT 10",
        [userId]
      );
    }

    // Add online status to each user
    const usersWithStatus = users.map((u) => {
      if (u.not_found) return null; // Return null as requested for missing users

      const isOnline = onlineUsers.has(u.id);
      return {
        id: u.id,
        username: u.username,
        is_online: isOnline,
        last_seen: isOnline ? "Online" : u.last_seen || "Never",
      };
    });

    res.json({ contacts: usersWithStatus });
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
