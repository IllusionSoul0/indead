import { useEffect, useState } from "react";
import ApplicationCard from "./ApplicationCard";
import { socket } from "../socket";
import "./JobCard.css";
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_TAGS_INPUT_LENGTH, MAX_COVER_LETTER_LENGTH, validateLength, sanitize, validatePositiveNumber } from "../utils/validation";

export default function JobCard({ job, user }) {
  const [applications, setApplications] = useState([]);
  const [applying, setApplying] = useState(false);
  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(0);
  const [tags, setTags] = useState("");

  const [coverLetter, setCoverLetter] = useState("");
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (!job) return;
    setTitle(job.title);
    setDescription(job.description);
    setBudget(job.budget);
    setTags(job.tags?.join(", ") || "");

    async function fetchJobDetails() {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/jobs/${job.id}`, {
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setApplications(data.applications || []);
      } catch (err) {
        console.error(err);
      }
    }

    fetchJobDetails();

    const handleApplicationCreated = ({ newApplication }) => {
      if (Number(job.id) !== Number(newApplication.job_id)) return;
      setApplications((prev) => [...prev, newApplication]);
    };

    const handleApplicationUpdated = ({ updatedApplication }) => {
      setApplications((prev) => prev.map((a) => (Number(a.id) === Number(updatedApplication.id) ? { ...a, ...updatedApplication } : a)));
    };

    const handleApplicationDeleted = ({ applicationId }) => {
      setApplications((prev) => prev.filter((a) => a.id !== Number(applicationId)));
    };

    socket.on("application:created", handleApplicationCreated);
    socket.on("application:updated", handleApplicationUpdated);
    socket.on("application:deleted", handleApplicationDeleted);

    return () => {
      socket.off("application:created", handleApplicationCreated);
      socket.off("application:updated", handleApplicationUpdated);
      socket.off("application:deleted", handleApplicationDeleted);
    };
  }, [job]);

  async function applyJob() {
    if (!coverLetter || !price) {
      alert("Please enter cover letter and price");
      return;
    }
    if (!validateLength(coverLetter, MAX_COVER_LETTER_LENGTH)) {
      alert(`Cover letter too long (max ${MAX_COVER_LETTER_LENGTH})`);
      return;
    }
    if (!validatePositiveNumber(price)) {
      alert("Price must be a positive number");
      return;
    }
    const safeCover = sanitize(coverLetter.trim());

    try {
      setApplying(true);
      await fetch(`${process.env.REACT_APP_API_URL}/jobs/${job.id}/apply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ coverLetter: safeCover, price: Number(price) }),
      });

      setCoverLetter("");
      setPrice(0);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setApplying(false);
    }
  }

  async function saveEdition() {
    try {
      if (!title.trim() || !description.trim()) {
        alert("Title and description cannot be empty");
        return;
      }
      if (!validateLength(title, MAX_TITLE_LENGTH)) {
        alert(`Title too long (max ${MAX_TITLE_LENGTH})`);
        return;
      }
      if (!validateLength(description, MAX_DESCRIPTION_LENGTH)) {
        alert(`Description too long (max ${MAX_DESCRIPTION_LENGTH})`);
        return;
      }
      if (!validatePositiveNumber(budget)) {
        alert("Invalid budget");
        return;
      }
      if (tags && !validateLength(tags, MAX_TAGS_INPUT_LENGTH)) {
        alert(`Tags too long (max ${MAX_TAGS_INPUT_LENGTH})`);
        return;
      }
      const updatedJob = {
        title: sanitize(title.trim()),
        description: sanitize(description.trim()),
        budget: Number(budget),
        tags: tags
          .split(",")
          .map((t) => sanitize(t.trim()))
          .filter((t) => t.length > 0),
      };

      const res = await fetch(`${process.env.REACT_APP_API_URL}/jobs/${job.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedJob),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditing(false);
      alert("Job updated!");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function deleteConfirmation() {
    if (window.confirm("Do you really want to delete this job offer ?")) {
      try {
        await fetch(`${process.env.REACT_APP_API_URL}/jobs/${job.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        alert("Job deleted successfully!");
      } catch (error) {
        alert(error.message);
      }
    }
  }

  return (
    <div className="job-card">
      {editing ? (
        <>
          <h2>Edit Job</h2>
          <div>
            <label>Title:</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_TITLE_LENGTH} />
          </div>
          <div>
            <label>Description:</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={MAX_DESCRIPTION_LENGTH} />
          </div>
          <div>
            <label>Budget:</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div>
            <label>Tags:</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags separated by commas" maxLength={MAX_TAGS_INPUT_LENGTH} />
          </div>

          <div id="job-edit-button">
            <button onClick={saveEdition}>Save</button>
            <button onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <h2>{job.title}</h2>
          <p>Employer: {job.email}</p>
          <p>Description : {job.description}</p>
          <p>Budget : {job.budget}€</p>
          {job.tags && (
            <div>
              {job.tags.map((tag, idx) => (
                <span key={idx} className="tags">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          {user.role === "employer" && user.id === job.employer_id && (
            <div>
              <img src="https://www.svgrepo.com/show/522525/edit-2.svg" alt="edit_icon" className="icon" onClick={() => setEditing(true)} />
              <img src="https://www.svgrepo.com/show/470444/trash.svg" alt="trash_icon" className="icon" onClick={() => deleteConfirmation()} />
            </div>
          )}
        </>
      )}

      {applications.length === 0 ? (
        user.role === "employer" ? (
          <p>No applications yet.</p>
        ) : (
          <div>
            <div>
              <label>Cover Letter:</label>
              <textarea placeholder="Cover Letter" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} maxLength={MAX_COVER_LETTER_LENGTH} />
            </div>
            <div>
              <label>Price:</label>
              <input type="number" placeholder="Price (€)" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <button onClick={applyJob} disabled={applying}>
              {applying ? "Applying..." : "Apply"}
            </button>
          </div>
        )
      ) : (
        <ApplicationCard applications={applications} user={user} jobEmployerId={job.employer_id} />
      )}
    </div>
  );
}
