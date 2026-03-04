import { useState } from "react";
import { Link } from "react-router-dom";
import { login } from "../../api/login";
import { connectSocket } from "../../socket";
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, validateEmail, validateLength, sanitize } from "../../utils/validation";

export default function LoginPage({ setLoggedIn, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateEmail(email)) {
      alert("Email is too long or invalid");
      return;
    }
    if (!validateLength(password, MAX_PASSWORD_LENGTH)) {
      alert("Password is too long");
      return;
    }

    const safeEmail = sanitize(email.trim());
    const safePassword = password;

    try {
      const data = await login(safeEmail, safePassword);

      setUser(data);
      setLoggedIn(true);

      connectSocket();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="single-page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit} className="column-form">
        <div>
          <label>Email:</label>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={MAX_EMAIL_LENGTH} />
        </div>

        <div>
          <label>Password:</label>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={MAX_PASSWORD_LENGTH} />
        </div>

        <button type="submit">
          Login
        </button>
      </form>

      <div className="auth-switch">
        New here ? <Link to="/register">Create an account</Link>
      </div>
    </div>
  );
}
