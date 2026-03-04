import { useSearchParams, useNavigate } from "react-router-dom";
import JobCard from "../../components/JobCard";
import { useEffect, useState } from "react";
import { socket } from "../../socket";
import JobList from "../../components/JobList";
import { MAX_SEARCH_LENGTH, MAX_TAGS_INPUT_LENGTH, sanitize, validateLength } from "../../utils/validation";

export default function JobPage({ user }) {
  const [jobs, setJobs] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(searchParams);
  const [search, setSearch] = useState(params.get("search") || "");
  const [tags, setTags] = useState(params.get("tags") || "");

  const [nextSelectedId, setNextSelectedId] = useState(null);
  const selectedId = searchParams.get("jobId");

  useEffect(() => {
    const loadJobs = async () => {
      await fetchJobs();
    };

    loadJobs();

    const handleJobCreated = ({ newJob }) => {
      setJobs((prev) => {
        return [newJob, ...prev];
      });
    };

    const handleJobDeleted = ({ jobId }) => {
      setJobs((prevJobs) => {
        const newJobs = prevJobs.filter((job) => job.id !== Number(jobId));

        if (!newJobs.some((job) => job.id === Number(searchParams.get("jobId")))) {
          setNextSelectedId(newJobs[0]?.id || null);
        }
        return newJobs;
      });
    };

    socket.on("job:created", handleJobCreated);
    socket.on("job:deleted", handleJobDeleted);
    return () => {
      socket.off("job:created", handleJobCreated);
      socket.off("job:deleted", handleJobDeleted);
    };
  }, []);

  useEffect(() => {
    if (nextSelectedId !== null) {
      onSelectJob(nextSelectedId);
      setNextSelectedId(null);
    }
  }, [nextSelectedId]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (search && !validateLength(search, MAX_SEARCH_LENGTH)) {
      alert(`Search term too long (max ${MAX_SEARCH_LENGTH})`);
      return;
    }
    if (tags && !validateLength(tags, MAX_TAGS_INPUT_LENGTH)) {
      alert(`Tag filter too long (max ${MAX_TAGS_INPUT_LENGTH})`);
      return;
    }

    await fetchJobs();
  }

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", sanitize(search));
      if (tags) params.set("tags", sanitize(tags));

      const res = await fetch(`${process.env.REACT_APP_API_URL}/jobs?${params.toString()}`);
      const data = await res.json();
      const jobsList = data.jobs;
      setJobs(jobsList || []);
      if (jobsList.length > 0) {
        onSelectJob(!selectedId || !jobsList.some((job) => job.id === Number(selectedId)) ? jobsList[0].id : selectedId);
      }
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setLoading(false);
    }
  };

  const onSelectJob = (jobId) => {
    if (!jobId) {
      return;
    }
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tags) params.set("tags", tags);
    params.set("jobId", jobId);
    navigate(`?${params.toString()}`, { replace: true });
  };

  if (loading) return <div>Fetching jobs...</div>;

  return (
    <>
      <div className="search-wrapper">
        <form className="search-form" onSubmit={handleSubmit}>
          <img src="https://www.svgrepo.com/show/532552/search-alt-2.svg" alt="search_icon" className="search-icon" />
          <input type="text" placeholder="Search job..." value={search} onChange={(e) => setSearch(e.target.value)} maxLength={MAX_SEARCH_LENGTH}></input>
          <input type="text" placeholder="Filter by tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} maxLength={MAX_TAGS_INPUT_LENGTH} />
          <button type="submit">Search</button>
        </form>
        {user?.role === "employer" && <button onClick={() => navigate("/create-job")}>+ Create Job</button>}
      </div>

      {jobs.length === 0 ? (
        <div className="single-page">
          <h2>No job found</h2>
        </div>
      ) : (
        <div className={user ? "double-page" : ""}>
          <div className={!user ? "single-page" : "left-page"}>
            <h2>Job List :</h2>
            <JobList jobs={jobs} setJobs={setJobs} selectedId={selectedId} user={user} onSelectJob={onSelectJob} />
          </div>

          {user && jobs.length > 0 && selectedId && (
            <div className="right-page">
              <JobCard jobs={jobs} jobId={selectedId} setJobs={setJobs} user={user} onSelectJob={onSelectJob} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
