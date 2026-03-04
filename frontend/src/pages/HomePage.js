import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="single-page">
      <h1>Welcome to Indead</h1>
      <Link to="/job">
        <button>Find a job</button>
      </Link>
    </div>
  );
}
