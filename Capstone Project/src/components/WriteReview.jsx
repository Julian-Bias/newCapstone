import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const WriteReview = () => {
  const [formData, setFormData] = useState({
    game_id: "",
    rating: "",
    review_text: "",
  });
  const [error, setError] = useState(null);
  const { isAuthenticated } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to submit review");
      alert("Review submitted successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAuthenticated) {
    return <p>You must be logged in to write a review.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Game ID:
        <input
          type="text"
          value={formData.game_id}
          onChange={(e) =>
            setFormData({ ...formData, game_id: e.target.value })
          }
          required
        />
      </label>
      <label>
        Rating (1-5):
        <input
          type="number"
          min="1"
          max="5"
          value={formData.rating}
          onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
          required
        />
      </label>
      <label>
        Review Text:
        <textarea
          value={formData.review_text}
          onChange={(e) =>
            setFormData({ ...formData, review_text: e.target.value })
          }
          required
        ></textarea>
      </label>
      {error && <p>Error: {error}</p>}
      <button type="submit">Submit Review</button>
    </form>
  );
};

export default WriteReview;
