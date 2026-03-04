const express = require("express");
const router = express.Router();
const db = require("../db.js");
const { auth, verifyRole } = require("../middlewares/auth.js");

router.post("/", auth, verifyRole("employer"), async (req, res) => {
  const { title, description, budget, tags } = req.body;

  if (!title || !description || !budget || !tags) {
    return res.status(400).json({ error: "All information required" });
  }

  if (title.length > 255) {
    return res.status(400).json({ error: "Title is too long" });
  }

  if (typeof budget !== "number" || budget <= 0) {
    return res.status(400).json({ error: "Budget must be a valid positiv integer" });
  }

  if (typeof tags !== "object" || !tags.every((t) => typeof t === "string")) {
    return res.status(400).json({ error: "Tags must be an array of string" });
  }

  try {
    const newJob = await db.one("INSERT INTO jobs(employer_id, title, description, budget, tags) VALUES($1, $2, $3, $4, $5) RETURNING *", [req.user.id, title, description, budget, tags]);

    const io = req.app.get("io");
    io.emit("job:created", { newJob });

    res.status(201).json({ message: "Job created successfuly", job: newJob });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create the job" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { tags, search } = req.query;

    const tagArray = tags ? tags.split(",") : null;

    let query = `SELECT jobs.id, jobs.title, jobs.description, jobs.budget, jobs.employer_id, users.email, jobs.tags FROM jobs JOIN users ON users.id = jobs.employer_id WHERE 1=1`;
    const params = [];

    if (tagArray) {
      params.push(tagArray);
      query += ` AND jobs.tags && $${params.length}::text[]`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND jobs.title ILIKE $${params.length}`;
    }

    query += ` ORDER BY jobs.created_at DESC`;

    const jobs = await db.any(query, params);

    res.status(200).json({ message: "Jobs fetch successfuly", jobs: jobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.get("/:jobId", auth, async (req, res) => {
  const jobId = req.params.jobId;

  if (isNaN(Number(jobId))) {
    return res.status(404).json({ error: "JobId must be an integer" });
  }

  try {
    const job = await db.oneOrNone(
      "SELECT jobs.id, jobs.title, jobs.description, jobs.budget, jobs.tags, jobs.created_at, jobs.employer_id, users.email AS employer_email FROM jobs JOIN users ON users.id = jobs.employer_id WHERE jobs.id = $1",
      [jobId],
    );

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    let applications = [];

    if (req.user.role === "employer" && req.user.id === job.employer_id) {
      applications = await db.any(
        "SELECT a.id, a.cover_letter, a.price, a.status, u.id AS freelancer_id, u.email AS freelancer_email FROM applications a JOIN users u ON u.id = a.freelancer_id WHERE a.job_id = $1 ORDER BY a.created_at DESC",
        [jobId],
      );
    } else if (req.user.role === "freelancer") {
      const application = await db.oneOrNone(
        "SELECT a.id, u.id AS freelancer_id, u.email AS freelancer_email, a.cover_letter, a.price, status FROM applications a JOIN users u ON u.id = a.freelancer_id WHERE job_id = $1 AND freelancer_id = $2",
        [jobId, req.user.id],
      );
      if (application) applications.push(application);
    }

    res.status(200).json({ message: "Job loaded successfuly", job, applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch job details" });
  }
});

router.post("/:jobId/apply", auth, verifyRole("freelancer"), async (req, res) => {
  const { coverLetter, price } = req.body;
  const jobId = req.params.jobId;

  if (!coverLetter || !price) {
    return res.status(400).json({ error: "All information required" });
  }

  if (isNaN(Number(jobId))) {
    return res.status(404).json({ error: "JobId must be an integer" });
  }

  try {
    const freelancerId = req.user.id;
    const application = await db.oneOrNone("SELECT * FROM applications WHERE freelancer_id = $1 AND job_id = $2", [freelancerId, jobId]);
    if (application) {
      return res.status(400).json({ error: "You already applied to this job" });
    }

    const newInsertedApplication = await db.one("INSERT INTO applications(job_id, freelancer_id, cover_letter, price) VALUES ($1, $2, $3, $4) RETURNING *", [jobId, freelancerId, coverLetter, price]);

    const newApplication = await db.one(
      "SELECT a.id, u.id AS freelancer_id, u.email AS freelancer_email, a.cover_letter, a.price, a.status, j.employer_id FROM applications a JOIN users u ON u.id = a.freelancer_id JOIN jobs j ON j.id = a.job_id WHERE a.id = $1",
      [newInsertedApplication.id],
    );

    const io = req.app.get("io");
    const userSockets = req.app.get("userSockets");

    if (newApplication.freelancer_id && userSockets.has(newApplication.freelancer_id)) {
      userSockets.get(newApplication.freelancer_id).forEach((socketId) => {
        io.to(socketId).emit("application:created", { newApplication });
      });
    }
    if (newApplication.employer_id && userSockets.has(newApplication.employer_id)) {
      userSockets.get(newApplication.employer_id).forEach((socketId) => {
        io.to(socketId).emit("application:created", { newApplication });
      });
    }

    res.status(201).json({ message: "Application created successfuly" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create the application" });
  }
});

router.delete("/:jobId", auth, verifyRole("employer"), async (req, res) => {
  const userId = req.user.id;
  const jobId = req.params.jobId;

  if (!userId) {
    return res.status(401).json({ error: "Not authorized" });
  }

  if (isNaN(Number(jobId))) {
    return res.status(404).json({ error: "JobId must be an integer" });
  }

  try {
    const job = await db.oneOrNone("SELECT * FROM jobs WHERE id = $1", [jobId]);
    if (!job) {
      return res.status(404).json({ error: "No job found" });
    }

    if (job.employer_id !== userId) {
      return res.status(401).json({ error: "User is not the creator of the job" });
    }

    const io = req.app.get("io");
    io.emit("job:deleted", { jobId });

    await db.none("DELETE FROM jobs WHERE id = $1", [jobId]);
    res.status(200).json({ message: "Jobs deleted successfuly" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete the job" });
  }
});

router.put("/:jobId", auth, verifyRole("employer"), async (req, res) => {
  const jobId = req.params.jobId;
  const { title, description, budget, tags } = req.body;

  if (!title || !description || !budget || !tags) {
    return res.status(400).json({ error: "All information required" });
  }

  if (isNaN(Number(jobId))) {
    return res.status(404).json({ error: "JobId must be an integer" });
  }

  try {
    const job = await db.oneOrNone("SELECT * FROM jobs WHERE id = $1", [jobId]);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.employer_id !== req.user.id) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const updatedJob = await db.one("UPDATE jobs SET title = $1, description = $2, budget = $3, tags = $4 WHERE id = $5 RETURNING id, title, description, budget, tags, employer_id", [
      title,
      description,
      budget,
      tags,
      jobId,
    ]);

    const io = req.app.get("io");
    io.emit("job:updated", { updatedJob });

    res.status(200).json({ message: "Job updated successfully", job: updatedJob });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update job" });
  }
});

module.exports = router;
