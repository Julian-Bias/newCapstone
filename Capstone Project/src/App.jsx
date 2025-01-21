import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserProfile from "./pages/UserProfile";
import GamesList from "./pages/SearchPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  const [user, setUser] = useState(null);

  // Fetch user role and ID from localStorage on component mount
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedUserId = localStorage.getItem("userId");
    if (storedRole && storedUserId) {
      setUser({ role: storedRole, id: storedUserId });
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData); // Update the user state with the logged-in user's data
    console.log("User logged in:", userData);
  };

  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/games" element={<GamesList />} />
        <Route path="/games/:id" element={<GamePage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              element={<AdminDashboard />}
              requiredRole="admin"
            />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
