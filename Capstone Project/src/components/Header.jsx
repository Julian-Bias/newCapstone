import React, { useContext } from "react";
import { Link } from "react-router-dom";

const Header = () => {
  const token = localStorage.getItem("token");

  return (
    <header>
      <nav>
        <Link to="/">Home</Link>
        {!token && <Link to="/login">Login</Link>}
        {!token && <Link to="/register">Register</Link>}
        {token && <Link to="/profile">Profile</Link>}
        {token && <button onClick={() => localStorage.removeItem("token")}>Logout</button>}
      </nav>
    </header>
  );
};

export default Header;
