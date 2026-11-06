import { useEffect, useRef, useState } from "react";
import { AuthContext } from "./authContext";

const API_URL = import.meta.env.VITE_API_URL || "";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const updatedByUser = useRef(false);
  const updateUser = (nextUser) => {
    updatedByUser.current = true;
    setUser(nextUser);
  };

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        return result.user || null;
      })
      .then((authenticatedUser) => {
        if (active && !updatedByUser.current) setUser(authenticatedUser);
      })
      .catch(() => {
        if (active && !updatedByUser.current) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return <AuthContext.Provider value={{ user, setUser: updateUser, loading }}>{children}</AuthContext.Provider>;
};
