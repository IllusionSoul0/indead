import { getUser } from "./getUser";

export async function register(email, password, role, profileData) {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, profileData }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  localStorage.setItem("hasToken", "true");

  return await getUser();
}
