export async function updateUser(email, password, profileData) {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/users/me`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, profileData }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Error while modifying the user information");
  }

  return await response.json();
}
