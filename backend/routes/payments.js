const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);;
const db = require("../db.js");

router.post("/intent", async (req, res) => {
  const user = req.user;
  const { applicationId, amount } = req.body;

  if (!user) {
    return res.status(401).json({ error: "Not authorized" });
  }

  if (!applicationId || !amount) {
    return res.status(400).json({ error: "All information required" });
  }

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Amount must be a valid positive number" });
  }

  try {
    const application = await db.oneOrNone("SELECT a.job_id, a.freelancer_id, a.cover_letter, a.price, a.status, j.employer_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = $1", [
      applicationId,
    ]);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.employer_id !== user.id) {
      return res.status(401).json({ error: "This application is not for a job offer you created" });
    }

    if (application.status !== "accepted") {
      await db.none("UPDATE applications SET status = 'accepted' WHERE id = $1", [applicationId]);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: {
        applicationId: applicationId,
        employerId: req.user.id,
      },
    });
    res.status(201).json({ message: "Payment intent created successfuly", application: { id: applicationId, status: "accepted" }, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error while registering the payment" });
  }
});

module.exports = router;
