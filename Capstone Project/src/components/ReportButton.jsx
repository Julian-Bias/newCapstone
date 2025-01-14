import React, { useState } from "react";

const ReportButton = ({ reviewId, commentId }) => {
  const [reported, setReported] = useState(false);
  const [error, setError] = useState(null);

  const handleReport = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to report content");

      const response = await fetch("http://localhost:3000/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewId, commentId }),
      });

      if (!response.ok) throw new Error("Failed to report content");
      setReported(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {reported ? (
        <p>Reported</p>
      ) : (
        <button onClick={handleReport}>Report</button>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default ReportButton;
