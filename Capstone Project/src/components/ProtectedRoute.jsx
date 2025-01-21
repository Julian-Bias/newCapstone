import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ element, requiredRole = null }) => {
  const { isAuthenticated, user } = useContext(AuthContext);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Redirect if role mismatch
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return element;
};

export default ProtectedRoute;
