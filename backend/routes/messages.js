const express = require("express");
const router = express.Router();
const db = require("../db.js");

router.get("/conversations", async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Not authorized" });

  try {
    const conversations = await db.any(
      "SELECT u.id AS user_id, u.email AS user_email, m.content AS last_message_content, m.sender_id AS last_message_sender_id, m.timestamp AS last_message_time, COALESCE(unread.unread_count, 0) AS unread_count FROM users u LEFT JOIN LATERAL (SELECT * FROM messages m WHERE (m.sender_id = u.id AND m.recipient_id = $1) OR (m.sender_id = $1 AND m.recipient_id = u.id) ORDER BY m.timestamp DESC LIMIT 1) m ON true LEFT JOIN (SELECT sender_id, COUNT(*) AS unread_count FROM messages WHERE recipient_id = $1 AND read = false GROUP BY sender_id) unread ON unread.sender_id = u.id WHERE u.id != $1 ORDER BY m.timestamp DESC;",
      [user.id],
    );

    res.status(200).json({ message: "Conversation fetched successfuly", conversations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/:userId", async (req, res) => {
  const otherId = req.params.userId;

  if (isNaN(otherId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  try {
    const myId = req.user.id;

    await db.none("UPDATE messages SET read = true WHERE sender_id = $1 AND recipient_id = $2", [otherId, myId]);

    const messages = await db.any("SELECT * FROM messages WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1) ORDER BY timestamp ASC", [myId, otherId]);

    res.status(200).json({ message: "Messages fetch successfuly", messages: messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load messages" });
  }
});

router.put("/readAll", async (req, res) => {
  const userId = req.user.id;

  try {
    db.none("UPDATE messages SET read = true WHERE recipient_id = $1", [userId]);

    res.status(200).json({ message: "All message set as read successfuly" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not ReadAll messages" });
  }
});

module.exports = router;
