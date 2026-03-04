const express = require("express");
const router = express.Router();
const db = require("../db.js");

router.get("/me", async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Not authorized" });
  }

  try {
    res.status(200).json({ message: "User fetched successfuly", id: user.id, email: user.email, role: user.role, profileData: user.profile_data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No account found" });
  }
});

router.put("/me", async (req, res) => {
  const user = req.user;
  const { email, password, profileData } = req.body;

  if (!user) {
    return res.status(401).json({ error: "Not authorized" });
  }

  let query = `UPDATE users SET email = $1, profile_data = $2`;
  const params = [email || user.email, profileData || user.profileData];

  if (password) {
    query += ` ,password = $3`;
    const newPassword = await hashPassword(password);
    params.push(newPassword);
  }

  params.push(user.id);
  query += `WHERE id= $${params.length} RETURNING email, profile_data`;

  try {
    const userUpdated = await db.one(query, params);
    res.status(200).json({ message: "User fetched successfuly", id: user.id, email: userUpdated.email, role: user.role, profileData: userUpdated.profile_data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No account found" });
  }
});

router.get("/", async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Not authorized" });
  }

  try {
    const usersList = await db.any("SELECT id, email, role FROM users WHERE id <> $1", [user.id]);

    res.status(200).json({ message: "Users fetched successfuly", users: usersList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No account found" });
  }
});

module.exports = router;
