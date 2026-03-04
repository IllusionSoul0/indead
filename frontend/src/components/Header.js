import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/indead_logo.png";
import { logout } from "../api/logout";

import ChatPopup from "./ChatPopup";
import "./Header.css";

export default function Header({ user, setUser, setLoggedIn }) {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const dropdownRef = useRef();
  const chatRef = useRef();
  const chatButtonRef = useRef();
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (chatRef.current && !chatRef.current.contains(e.target) && chatButtonRef.current && !chatButtonRef.current.contains(e.target)) {
        setChatOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      setUser(null);
      setLoggedIn(false);
    } catch (error) {
      alert("Failed to logout: " + error.message);
    }
  }

  return (
    <header>
      <div className="left">
        <Link to="/">
          <img src={logo} alt="indead_logo" className="logo" />
        </Link>

        <div style={location.pathname === "/" ? { borderBottom: "2px solid #c89b3c" } : {}}>
          <Link to="/" className="link">
            Home
          </Link>
        </div>

        <div style={location.pathname === "/job" ? { borderBottom: "2px solid #c89b3c" } : {}}>
          <Link to="/job" className="link">
            Jobs
          </Link>
        </div>
      </div>

      <div className="user-wrapper" ref={dropdownRef}>
        {user && <img ref={chatButtonRef} src="https://www.svgrepo.com/show/485668/chat.svg" alt="chat_icon" className="header_icon" onClick={() => setChatOpen((prev) => !prev)} />}
        <img src="https://www.svgrepo.com/show/508196/user-circle.svg" alt="user_icon" className="header_icon" onClick={() => setOpen((prev) => !prev)} />

        {open && (
          <div className="dropdown">
            {!user ? (
              <>
                <Link to="/login" className="dropdown-item">
                  Login
                </Link>
                <Link to="/register" className="dropdown-item">
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link to="/profile" className="dropdown-item">
                  Profile
                </Link>
                <a className="dropdown-item" onClick={handleLogout}>
                  Logout
                </a>
              </>
            )}
          </div>
        )}

        {chatOpen && (
          <div ref={chatRef} style={{ position: "absolute", right: 0, top: "50px", zIndex: 100 }}>
            <ChatPopup user={user} />
          </div>
        )}
      </div>
    </header>
  );
}
