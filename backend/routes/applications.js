const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { verifyRole } = require("../middlewares/auth.js");

router.put("/:applicationId/:newStatus", verifyRole("employer"), async (req, res) => {
  const applicationId = req.params.applicationId;
  const newApplicationStatus = req.params.newStatus;
  const user = req.user;

  if (isNaN(Number(applicationId))) {
    return res.status(400).json({ error: "ApplicationId must be an integer" });
  }

  if (!["applied", "pending", "accepted", "paid"].includes(newApplicationStatus)) {
    return res.status(400).json({ error: "NewApplicationStatus must be either applied, pending, accepted or paid" });
  }

  try {
    const application = await db.oneOrNone("SELECT * FROM applications JOIN jobs ON jobs.id = applications.job_id WHERE applications.id = $1", [applicationId]);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.employer_id !== user.id) {
      return res.status(403).json({ error: "You are not the creator of this job" });
    }

    if (application.status !== newApplicationStatus) {
      await db.none("UPDATE applications SET status = $1 WHERE id = $2", [newApplicationStatus, applicationId]);

      res.status(200).json({ message: "Application updated successfuly" });
    } else {
      res.status(200).json({ message: "No change: status already up to date" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to change the application status" });
  }
});

router.put("/:applicationId", verifyRole("freelancer"), async (req, res) => {
  const applicationId = req.params.applicationId;
  const { coverLetter, price } = req.body;
  const user = req.user;

  if (isNaN(Number(applicationId))) {
    return res.status(400).json({ error: "ApplicationId must be an integer" });
  }

  try {
    const application = await db.oneOrNone("SELECT a.id, a.freelancer_id, j.employer_id, a.cover_letter, a.price FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = $1", [applicationId]);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (user.id !== application.freelancer_id) {
      return res.status(403).json({ error: "You must be the creator of the application update this application" });
    }

    await db.none("UPDATE applications SET cover_letter = $1, price = $2 WHERE id = $3", [coverLetter ?? application.cover_letter, price ?? application.price, applicationId]);
    res.status(200).json({ message: "Application updated successfuly" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update the application" });
  }
});

router.delete("/:applicationId", async (req, res) => {
  const applicationId = req.params.applicationId;
  const user = req.user;

  if (isNaN(Number(applicationId))) {
    return res.status(400).json({ error: "ApplicationId must be an integer" });
  }

  try {
    const application = await db.oneOrNone("SELECT a.id, a.freelancer_id, j.employer_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = $1", [applicationId]);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (user.id !== application.freelancer_id && user.id !== application.employer_id) {
      return res.status(403).json({ error: "You must be either the creator of the application or the creator of the job offer to delete this application" });
    }

    await db.none("DELETE FROM applications WHERE id = $1", [applicationId]);

    const io = req.app.get("io");
    const userSockets = req.app.get("userSockets");
    const recipientId = application.freelancer_id;
    const employerId = application.employer_id;
    if (recipientId && userSockets.has(recipientId)) {
      userSockets.get(recipientId).forEach((socketId) => {
        io.to(socketId).emit("application:deleted", { applicationId });
      });
    }
    if (employerId && userSockets.has(employerId)) {
      userSockets.get(employerId).forEach((socketId) => {
        io.to(socketId).emit("application:deleted", { applicationId });
      });
    }

    res.status(200).json({ message: "Application deleted successfuly" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete the application" });
  }
});

module.exports = router;
