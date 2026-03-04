import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_TAGS_INPUT_LENGTH, validateLength, sanitize, validatePositiveNumber } from "../../utils/validation";

export default function CreateJobPage({ user }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(0);
  const [tags, setTags] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "employer") {
      alert("You must be an employer to create a job");
      navigate("/jobs");
    }
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();

    const safeTitle = sanitize(title.trim());
    const safeDescription = sanitize(description.trim());

    if (safeTitle === "" || safeDescription === "") {
      alert("Please enter valid title and description");
      return;
    }
    if (!validateLength(safeTitle, MAX_TITLE_LENGTH)) {
      alert(`Title must be at most ${MAX_TITLE_LENGTH} characters`);
      return;
    }
    if (!validateLength(safeDescription, MAX_DESCRIPTION_LENGTH)) {
      alert(`Description too long (max ${MAX_DESCRIPTION_LENGTH})`);
      return;
    }
    if (!validatePositiveNumber(budget)) {
      alert("Budget must be a positive number");
      return;
    }

    const tagsArray = tags
      .split(",")
      .map((t) => sanitize(t.trim()))
      .filter((t) => t.length > 0);
    if (tags && !validateLength(tags, MAX_TAGS_INPUT_LENGTH)) {
      alert(`Tags input is too long (max ${MAX_TAGS_INPUT_LENGTH})`);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/jobs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ title: safeTitle, description: safeDescription, budget: Number(budget), tags: tagsArray }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to create job");
        return;
      }

      alert("Job created!");
      navigate(`/job?jobId=${data.job.id}`);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="single-page">
      <h1>Create a Job Offer</h1>

      <form onSubmit={handleSubmit} className="column-form">
        <div>
          <label>Title:</label>
          <input type="text" placeholder="Job Title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={MAX_TITLE_LENGTH} />
        </div>

        <div>
          <label>Description:</label>
          <textarea placeholder="Job Description" value={description} onChange={(e) => setDescription(e.target.value)} rows="4" required maxLength={MAX_DESCRIPTION_LENGTH} />
        </div>

        <div>
          <label>Budget:</label>
          <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min="1" required />
        </div>

        <div>
          <label>Tags:</label>
          <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} maxLength={MAX_TAGS_INPUT_LENGTH} />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Job"}
        </button>
      </form>
    </div>
  );
}
