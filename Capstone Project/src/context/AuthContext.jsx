import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Sync with localStorage on mount
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedUserId = localStorage.getItem("userId");
    if (storedRole && storedUserId) {
      setUser({ role: storedRole, id: storedUserId });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
