import { disconnectSocket } from "../socket";

export async function logout() {
  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/logout`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Logout failed");
    }

    disconnectSocket();
    localStorage.setItem("hasToken", false);

    return true;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
