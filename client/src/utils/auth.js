const API_URL = import.meta.env.VITE_API_URL || "";
const allowedRoles = {
  customer: ["customer"],
  admin: ["admin", "manager", "user"],
};

const readResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const signIn = async ({ audience, email, password }) => {
  const credentials = { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) };
  let response = await fetch(`${API_URL}/api/auth/login/${audience}`, credentials);
  let result = await readResponse(response);

  // Older production servers only expose /api/auth/login. Keep the audience
  // check here until that server has the role-specific routes deployed.
  if (response.status === 404) {
    response = await fetch(`${API_URL}/api/auth/login`, credentials);
    result = await readResponse(response);
  }

  if (!response.ok) throw new Error(result.message || "Invalid email or password.");

  if (!allowedRoles[audience]?.includes(result.user?.role)) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // The page still rejects the mismatched role if the session cleanup fails.
    }
    throw new Error("These credentials cannot be used on this sign-in page.");
  }

  return result;
};
