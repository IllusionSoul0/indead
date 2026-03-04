import { useState } from "react";
import { updateUser } from "../../api/updateUser";
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

export default function ProfilePage({ user }) {
  const role = user.role;
  const [editing, setEditing] = useState(false);

  const [email, setEmail] = useState(user.email || "");
  const [fullName, setFullName] = useState(user.profileData?.fullName || "");
  const [bio, setBio] = useState(user.profileData?.bio || "");
  const [tags, setTags] = useState(user.profileData?.tags?.join(", ") || "");
  const [companyName, setCompanyName] = useState(user.profileData?.companyName || "");
  const [companyDescription, setCompanyDescription] = useState(user.profileData?.companyDescription || "");

  const [tempEmail, setTempEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [tempConfirmPassword, setTempConfirmPassword] = useState("");
  const [tempFullName, setTempFullName] = useState("");
  const [tempBio, setTempBio] = useState("");
  const [tempTags, setTempTags] = useState("");
  const [tempCompanyName, setTempCompanyName] = useState("");
  const [tempCompanyDescription, setTempCompanyDescription] = useState("");

  const startEditing = () => {
    setTempEmail(email);
    setTempPassword("");
    setTempConfirmPassword("");
    setTempFullName(fullName);
    setTempBio(bio);
    setTempTags(tags);
    setTempCompanyName(companyName);
    setTempCompanyDescription(companyDescription);
    setEditing(true);
  };

  if (!user)
    return (
      <div className="single-page">
        <h1>Please log in to view your profile.</h1>
      </div>
    );

  async function handleSave(e) {
    e.preventDefault();

    if (!validateEmail(tempEmail)) {
      alert("Email is too long or invalid");
      return;
    }
    if (tempPassword && !validateLength(tempPassword, MAX_PASSWORD_LENGTH)) {
      alert("New password is too long");
      return;
    }
    if (tempPassword && tempPassword !== tempConfirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const profileData =
      role === "freelancer"
        ? {
            fullName: sanitize(tempFullName.trim()),
            bio: sanitize(tempBio.trim()),
            tags: tempTags
              .split(",")
              .map((t) => sanitize(t.trim()))
              .filter((t) => t.length > 0),
          }
        : {
            companyName: sanitize(tempCompanyName.trim()),
            companyDescription: sanitize(tempCompanyDescription.trim()),
          };

    try {
      await updateUser(tempEmail, tempPassword, profileData);

      setEmail(tempEmail);
      setFullName(tempFullName);
      setBio(tempBio);
      setTags(tempTags);
      setCompanyName(tempCompanyName);
      setCompanyDescription(tempCompanyDescription);

      setEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      alert("Error: " + error.message);
    }
  }

  if (!editing) {
    return (
      <div className="single-page">
        <h1>Profile</h1>
        <p>
          <strong>Email:</strong> {email}
        </p>
        {role === "freelancer" ? (
          <>
            <p>
              <strong>Full Name:</strong> {fullName}
            </p>
            {bio && (
              <p>
                <strong>Bio:</strong> {bio}
              </p>
            )}
            {tags && (
              <p>
                <strong>Tags:</strong>{" "}
                {tags
                  .split(",")
                  .map((t) => sanitize(t.trim()))
                  .filter((t) => t.length > 0)
                  .map((tag, i) => (
                    <span key={i} className="tags">
                      {tag}
                    </span>
                  ))}
              </p>
            )}
          </>
        ) : (
          <>
            <p>
              <strong>Company Name:</strong> {companyName}
            </p>
            {companyDescription && (
              <p>
                <strong>Company Description:</strong> {companyDescription}
              </p>
            )}
          </>
        )}
        <button onClick={startEditing}>Edit Profile</button>
      </div>
    );
  }

  return (
    <div className="single-page">
      <h1>Profile</h1>
      <form onSubmit={handleSave} className="column-form">
        <div>
          <label>Email:</label>
          <input type="email" value={tempEmail} onChange={(e) => setTempEmail(e.target.value)} required maxLength={MAX_EMAIL_LENGTH} />
        </div>

        <div>
          <label>New Password:</label>
          <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Leave blank to keep current password" maxLength={MAX_PASSWORD_LENGTH} />
        </div>

        <div>
          <label>Confirm Password:</label>
          <input
            type="password"
            value={tempConfirmPassword}
            onChange={(e) => setTempConfirmPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            maxLength={MAX_PASSWORD_LENGTH}
          />
        </div>

        {role === "freelancer" && (
          <>
            <div>
              <label>Full Name:</label>
              <input type="text" value={tempFullName} onChange={(e) => setTempFullName(e.target.value)} required maxLength={MAX_FULLNAME_LENGTH} />
            </div>
            <div>
              <label>Bio:</label>
              <input type="text" value={tempBio} onChange={(e) => setTempBio(e.target.value)} maxLength={MAX_BIO_LENGTH} />
            </div>
            <div>
              <label>Tags (comma separated):</label>
              <input type="text" value={tempTags} onChange={(e) => setTempTags(e.target.value)} maxLength={MAX_TAGS_INPUT_LENGTH} />
            </div>
          </>
        )}

        {role === "employer" && (
          <>
            <div>
              <label>Company Name:</label>
              <input type="text" value={tempCompanyName} onChange={(e) => setTempCompanyName(e.target.value)} required maxLength={MAX_COMPANY_NAME_LENGTH} />
            </div>
            <div>
              <label>Company Description:</label>
              <input type="text" value={tempCompanyDescription} onChange={(e) => setTempCompanyDescription(e.target.value)} maxLength={MAX_COMPANY_DESC_LENGTH} />
            </div>
          </>
        )}

        <div id="column-form-button">
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
