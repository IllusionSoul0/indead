const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../db.js");
const loginLimiter = require("../middlewares/rateLimit.js");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const hashPassword = async (plainPassword) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    return hashedPassword;
  } catch (error) {
    console.error("Error while hashing the password :", error);
    throw error;
  }
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  try {
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    return match;
  } catch (error) {
    console.error("Error while verifying the password :", error);
    throw error;
  }
};

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req?.body;

  if (!email || !password) {
    return res.status(400).json({ error: "All information required" });
  }

  try {
    const user = await db.oneOrNone("SELECT id, password, email, role, profile_data as profileData FROM users WHERE email = $1", [email]);
    if (!user) {
      return res.status(401).json({ error: "Email not found" });
    }

    const password_hash = user.password;
    const valid = await verifyPassword(password, password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid Password" });
    }

    const id = user.id;

    const jwtToken = jwt.sign({ id, email }, process.env.JWT_SECRET, {
      expiresIn: "5h",
    });

    res.cookie("jwtToken", jwtToken, { httpOnly: true, secure: true });
    res.status(200).json({ message: "Connexion successful", token: jwtToken, user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: "Error while login" });
  }
});

router.post("/register", loginLimiter, async (req, res) => {
  const { email, password, role, profileData } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: "All information required" });
  }

  const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [email]);
  if (user) {
    return res.status(400).json({ error: "Email already used" });
  }

  if (!["freelancer", "employer"].includes(role.toLowerCase())) {
    return res.status(400).json({ error: "Role must be either Freelancer or Employer" });
  }

  if (typeof profileData !== "object" || profileData === null) {
    return res.status(400).json({ error: "profileData must be a JSON" });
  }

  try {
    const password_hash = await hashPassword(password);
    const newUser = await db.one("INSERT INTO users(email, password, role, profile_data) VALUES ($1, $2, $3, $4) RETURNING id, email, role, profile_data as profileData", [
      email,
      password_hash,
      role.toLowerCase(),
      profileData,
    ]);

    const id = newUser.id;

    const jwtToken = jwt.sign({ id, email }, process.env.JWT_SECRET, {
      expiresIn: "5h",
    });

    res.cookie("jwtToken", jwtToken, { httpOnly: true, secure: true });
    res.status(201).json({ message: "User registered successfuly", token: jwtToken, user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "There was an error while registering the user" });
  }
});

router.get("/logout", (req, res) => {
  try {
    res.clearCookie("jwtToken");
    res.status(200).json({ message: "Disconnected successfuly" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error while login out" });
  }
});

router.get("/isTokenValid", (req, res) => {
  try {
    const token = req.cookies.jwtToken;

    if (!token) {
      return res.status(401).json({ error: "Token not found" });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err && err.name === "TokenExpiredError") {
        const oldDecoded = jwt.decode(token);
        if (!oldDecoded?.email) {
          return res.status(401).json({ error: "Invalid token" });
        }

        const user = await db.oneOrNone("SELECT id, email, role, profile_data FROM users WHERE email = $1", [oldDecoded.email]);

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const newToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "5h" });

        res.cookie("jwtToken", newToken, { httpOnly: true, secure: true });

        return res.json({
          message: "Token refreshed",
          user: { id: user.id, email: user.email, role: user.role, profileData: user.profile_data },
          token: newToken,
        });
      }

      if (err) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const user = await db.oneOrNone("SELECT id, email, role, profile_data FROM users WHERE email = $1", [decoded.email]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({
        message: "Token valid",
        user: { id: user.id, email: user.email, role: user.role, profileData: user.profile_data },
        token,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error while checking the token" });
  }
});

module.exports = router;
