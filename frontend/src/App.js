import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import "./layout.css";
import "./App.css";

import { connectSocket } from "./socket";

import { getUser } from "./api/getUser";

import Header from "./components/Header";
import Footer from "./components/Footer";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ProfilePage from "./pages/auth/ProfilePage";
import JobPage from "./pages/jobs/JobPage";
import CreateJobPage from "./pages/jobs/CreateJobPage";
import HomePage from "./pages/HomePage";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_KEY);

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const hasToken = localStorage.getItem("hasToken") === "true";
      if (!hasToken) {
        setUser(null);
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/isTokenValid`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to verify token");

        const userData = await getUser();
        setUser(userData);
        setLoggedIn(true);
        connectSocket();
      } catch (error) {
        setUser(null);
        setLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Elements stripe={stripePromise}>
      <Router>
        <Header user={user} setUser={setUser} setLoggedIn={setLoggedIn} />
        <main>
          <Routes>
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={loggedIn ? <Navigate to="/" /> : <LoginPage setLoggedIn={setLoggedIn} setUser={setUser} />} />
            <Route path="/register" element={loggedIn ? <Navigate to="/" /> : <RegisterPage setLoggedIn={setLoggedIn} setUser={setUser} />} />
            <Route path="/profile" element={!loggedIn ? <Navigate to="/" /> : <ProfilePage user={user} />} />
            <Route path="/job" element={<JobPage user={user} />} />
            <Route path="/create-job" element={loggedIn ? <CreateJobPage user={user} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </Elements>
  );
}

export default App;
