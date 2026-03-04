export async function getUser() {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/users/me`, {
    credentials: "include",
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Not logged in");
  }

  return await response.json();
}
