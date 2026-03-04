import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState, useEffect } from "react";
import { payApplication } from "../api/stripe";
import "./ApplicationCard.css";
import { MAX_COVER_LETTER_LENGTH, validateLength, sanitize, validatePositiveNumber } from "../utils/validation";

const cardStyle = {
  style: {
    base: {
      color: "#f0e6d2",
      fontSize: "16px",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      "::placeholder": { color: "#a09b8c" },
      iconColor: "#c89b3c",
      backgroundColor: "#1e2328",
      letterSpacing: "0.5px",
    },
    invalid: { color: "#ff6b6b", iconColor: "#ff6b6b" },
    complete: { color: "#c89b3c" },
  },
};

export default function ApplicationCard({ applications, user, jobEmployerId }) {
  const [selectedId, setSelectedId] = useState(null);
  const [editingApp, setEditingApp] = useState({ id: null, coverLetter: "", price: 0 });
  const [loadingPay, setLoadingPay] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState({});
  const elements = useElements();
  const stripe = useStripe();

  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    setStatuses(
      applications.reduce((acc, app) => {
        acc[app.id] = app.status;
        return acc;
      }, {}),
    );
    setSelectedId(applications?.[0]?.id || null);
  }, [applications]);

  const isEmployer = user.role === "employer" && user.id === jobEmployerId;

  async function handlePay(e, app) {
    e.preventDefault();
    if (!elements) return;

    try {
      setLoadingPay((p) => ({ ...p, [app.id]: true }));
      const card = elements.getElement(CardElement);
      await payApplication(app.id, app.price, card, stripe);

      const res = await fetch(`${process.env.REACT_APP_API_URL}/applications/${app.id}/paid`, {
        method: "PUT",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatuses((prev) => ({ ...prev, [app.id]: "paid" }));
      alert(`Paid €${app.price} to ${app.freelancer_email}!`);
    } catch (error) {
      alert("Payment failed: " + error.message);
    } finally {
      setLoadingPay((p) => ({ ...p, [app.id]: false }));
    }
  }

  async function handleStatusChange(app, newStatus) {
    setUpdatingStatus((p) => ({ ...p, [app.id]: true }));

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/applications/${app.id}/${newStatus}`, {
        method: "PUT",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatuses((prev) => ({ ...prev, [app.id]: newStatus }));
      alert(data.message);
    } catch (error) {
      alert("Error updating status: " + error.message);
    } finally {
      setUpdatingStatus((p) => ({ ...p, [app.id]: false }));
    }
  }

  async function deleteConfirmation(appId) {
    if (!window.confirm("Do you really want to delete this application?")) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/applications/${appId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleEditSave(appId, newCoverLetter, newPrice) {
    if (!newCoverLetter || !validateLength(newCoverLetter, MAX_COVER_LETTER_LENGTH)) {
      alert("Invalid cover letter");
      return;
    }
    if (!validatePositiveNumber(newPrice)) {
      alert("Invalid price");
      return;
    }

    try {
      const safe = sanitize(newCoverLetter.trim());

      const res = await fetch(`${process.env.REACT_APP_API_URL}/applications/${appId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter: safe, price: newPrice }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEditingApp({ id: null, coverLetter: "", price: 0 });
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div>
      {applications.map((app) => {
        const isSelected = selectedId === app.id;
        const isOwner = app.freelancer_id === user.id;

        return (
          <div key={app.id} className={`application-card${isSelected && isEmployer ? " selected" : ""}`} onClick={() => setSelectedId(app.id)}>
            <div id="flex-space-between">
              <div>
                {!isEmployer && <h3>Your application :</h3>}
                <p>Freelancer: {app.freelancer_email}</p>

                {editingApp.id === app.id && isOwner ? (
                  <>
                    <div>
                      <label>Cover Letter:</label>
                      <textarea value={editingApp.coverLetter} onChange={(e) => setEditingApp((p) => ({ ...p, coverLetter: e.target.value }))} maxLength={MAX_COVER_LETTER_LENGTH} />
                    </div>

                    <div>
                      <label>Price:</label>
                      <input type="number" value={editingApp.price} onChange={(e) => setEditingApp((p) => ({ ...p, price: Number(e.target.value) }))} />
                    </div>

                    <button onClick={() => handleEditSave(app.id, editingApp.coverLetter, editingApp.price)}>Save</button>
                    <button onClick={() => setEditingApp({ id: null, coverLetter: "", price: 0 })}>Cancel</button>
                  </>
                ) : (
                  <>
                    <p>Cover Letter: {app.cover_letter}</p>
                    <p>Price: {app.price}€</p>
                  </>
                )}

                {isEmployer && statuses[app.id] !== "paid" ? (
                  <p>
                    Status:&nbsp;
                    <select value={statuses[app.id]} onChange={(e) => handleStatusChange(app, e.target.value)} disabled={updatingStatus[app.id]}>
                      <option value="applied">Applied</option>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </p>
                ) : (
                  <p>Status: {statuses[app.id]}</p>
                )}
              </div>

              {(isEmployer || isOwner) && (
                <div>
                  {editingApp.id !== app.id && isOwner && statuses[app.id] !== "paid" && (
                    <img
                      src="https://www.svgrepo.com/show/522525/edit-2.svg"
                      alt="edit_icon"
                      className="icon"
                      onClick={() => setEditingApp({ id: app.id, coverLetter: app.cover_letter, price: app.price })}
                    />
                  )}
                  {statuses[app.id] !== "paid" && <img src="https://www.svgrepo.com/show/470444/trash.svg" alt="trash_icon" className="icon" onClick={() => deleteConfirmation(app.id)} />}
                </div>
              )}
            </div>

            {isSelected && isEmployer && statuses[app.id] === "accepted" && (
              <>
                <CardElement options={cardStyle} />
                <button onClick={(e) => handlePay(e, app)} disabled={loadingPay[app.id]}>
                  {loadingPay[app.id] ? "Processing..." : "Pay"}
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
