const jwt = require("jsonwebtoken");
const db = require("../db");

function auth(req, res, next) {
  const jwtToken = req.cookies["jwtToken"];
  if (!jwtToken) {
    return res.status(401).json({ error: "Not authorized" });
  }
  jwt.verify(jwtToken, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const userInfo = await db.one("SELECT * FROM users WHERE email = $1", [decoded.email]);
    req.user = userInfo;
    next();
  });
}

function verifyRole(requiredRole) {
  const validRoles = ["freelancer", "employer"];
  if (!validRoles.includes(requiredRole)) {
    throw new Error(`Invalid role passed to verifyRole(): "${requiredRole}"`);
  }

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authorized" });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: requiredRole === "freelancer" ? "This action is restricted to freelancers only" : "This action is restricted to employers only",
      });
    }
    next();
  };
}

module.exports = { auth, verifyRole };
