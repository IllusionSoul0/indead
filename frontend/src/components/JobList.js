export default function JobList({ jobs, selectedId, setJobs, user, onSelectJob }) {
  async function deleteConfirmation(jobId) {
    if (window.confirm("Do you really want to delete this job offer ?")) {
      try {
        await fetch(`${process.env.REACT_APP_API_URL}/jobs/${jobId}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch (error) {
        alert(error.message);
      }
    }
  }

  return (
    <div className={user ? "" : "wide"}>
      {jobs &&
        jobs.map((job) => {
          const isSelected = job.id === Number(selectedId) && user;
          const userIsCreator = user && job.employer_id === user.id;

          const handleClick = () => {
            if (!user) {
              alert("Please login to see more information about this job");
              return;
            }
            onSelectJob(job.id);
          };
          return (
            <div role="button" key={job.id} onClick={handleClick} id="flex-space-between" className={"card" + (isSelected ? " selected" : "")} style={{ justifyContent: user ? "" : "center" }}>
              <div>
                <h3>{job.title}</h3>
                {job.tags &&
                  job.tags.map((tag, idx) => (
                    <span key={idx} className="tags">
                      {tag.trim()}
                    </span>
                  ))}
              </div>
              {userIsCreator && (
                <div className="job-creator-div">
                  <img src="https://www.svgrepo.com/show/470444/trash.svg" alt="trash_icon" className="icon" onClick={() => deleteConfirmation(job.id)} />
                  <p className="your-offer">Your offer</p>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
