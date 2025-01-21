import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Invalid email or password");
      }

      const { token, user } = await response.json();

      // Save token, userId, and role in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("role", user.role); // Store role

      console.log("User Role stored in Local Storage:", user.role);

      // Call the onLogin function to update parent state
      if (onLogin) {
        onLogin(user);
      }

      // Redirect to profile page or admin dashboard
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/profile");
      }
    } catch (err) {
      setError(err.message);
      console.error("Login Error:", err.message);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <br />
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <br />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
