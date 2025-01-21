import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ element, requiredRole }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    console.log("User not logged in. Redirecting to login.");
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    console.log("User does not have the required role. Redirecting to login.");
    return <Navigate to="/login" />;
  }

  return element;
};

export default ProtectedRoute;
