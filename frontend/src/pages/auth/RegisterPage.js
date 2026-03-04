import { useState } from "react";
import { register } from "../../api/register";
import { connectSocket } from "../../socket";
import { Link } from "react-router-dom";
import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_FULLNAME_LENGTH,
  MAX_BIO_LENGTH,
  MAX_TAGS_INPUT_LENGTH,
  MAX_COMPANY_NAME_LENGTH,
  MAX_COMPANY_DESC_LENGTH,
  sanitize,
  validateLength,
  validateEmail,
} from "../../utils/validation";

export default function RegisterPage({ setLoggedIn, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("freelancer");

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

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
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const safeEmail = sanitize(email.trim());
    const safeRole = sanitize(role);

    const profileData =
      role === "freelancer"
        ? {
            fullName: sanitize(fullName.trim()),
            bio: sanitize(bio.trim()),
            tags: tags
              .split(",")
              .map((t) => sanitize(t.trim()))
              .filter((t) => t.length > 0),
          }
        : {
            companyName: sanitize(companyName.trim()),
            companyDescription: sanitize(companyDescription.trim()),
          };

    try {
      const data = await register(email, password, role, profileData);

      setUser(data);
      setLoggedIn(true);

      connectSocket();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="single-page">
      <h1>Register</h1>
      <form onSubmit={handleSubmit} className="column-form">
        <div>
          <label>Email: *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={MAX_EMAIL_LENGTH} />
        </div>

        <div>
          <label>Password: *</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={MAX_PASSWORD_LENGTH} />
        </div>

        <div>
          <label>Confirm Password: *</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required maxLength={MAX_PASSWORD_LENGTH} />
        </div>

        <div>
          <label>Role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="freelancer">Freelancer</option>
            <option value="employer">Employer</option>
          </select>
        </div>

        {role === "freelancer" && (
          <>
            <div>
              <label>Full Name: *</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={MAX_FULLNAME_LENGTH} />
            </div>

            <div>
              <label>Bio:</label>
              <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={MAX_BIO_LENGTH} />
            </div>

            <div>
              <label>Tags (comma separated):</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} maxLength={MAX_TAGS_INPUT_LENGTH} />
            </div>
          </>
        )}

        {role === "employer" && (
          <>
            <div>
              <label>Company Name: *</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required maxLength={MAX_COMPANY_NAME_LENGTH} />
            </div>

            <div>
              <label>Company Description:</label>
              <input type="text" value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} maxLength={MAX_COMPANY_DESC_LENGTH} />
            </div>
          </>
        )}

        <button type="submit">
          Register
        </button>
      </form>

      <div className="auth-switch">
        Already have an account ? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}
