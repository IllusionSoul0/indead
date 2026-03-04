const express = require("express");
const router = express.Router();

const { auth, verifyRole } = require("../middlewares/auth");

const authRoutes = require("./auth");
const usersRoutes = require("./users");
const jobsRoutes = require("./jobs");
const applicationsRoutes = require("./applications");
const messagesRoutes = require("./messages");
const paymentsRoutes = require("./payments")

router.use("/auth", authRoutes);
router.use("/users", auth, usersRoutes);
router.use("/jobs", jobsRoutes);
router.use("/applications", auth, applicationsRoutes);
router.use("/messages", auth, messagesRoutes);
router.use("/payments", auth, verifyRole("employer"), paymentsRoutes)

module.exports = router;
