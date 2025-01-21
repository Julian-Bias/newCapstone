import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    navigate("/login"); // Redirect to login after logout
  };

  return (
    <header>
      <nav>
        <Link to="/">Home</Link>
        {!token && <Link to="/login">Login</Link>}
        {!token && <Link to="/register">Register</Link>}||
        {token && <Link to="/games">Search Games</Link>}||
        {token && <Link to="/profile">Profile</Link>}||
        {token && <button onClick={handleLogout}>Logout</button>}
      </nav>
    </header>
  );
};

export default Header;
