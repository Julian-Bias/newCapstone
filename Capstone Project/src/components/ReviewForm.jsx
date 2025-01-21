import React, { useState } from "react";

const ReviewForm = ({ gameId, onReviewSubmit }) => {
  const [rating, setRating] = useState(1);
  const [reviewText, setReviewText] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent double submission
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to submit a review");

      const formData = new FormData();
      formData.append("game_id", gameId);
      formData.append("rating", rating);
      formData.append("review_text", reviewText);
      if (image) formData.append("image", image);

      const response = await fetch("http://localhost:3000/api/reviews", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to submit review");

      const newReview = await response.json();
      setError(null);
      onReviewSubmit(newReview);
      setRating(1);
      setReviewText("");
      setImage(null); // Clear the file input
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false); // Re-enable the button after submission
    }
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <h3>Write a Review</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <label>
        Rating:
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        Review:
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
        />
      </label>
      <label>
        Upload Image:
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />
      </label>
      <button type="submit" disabled={submitting}>
        Submit
      </button>
    </form>
  );
};

export default ReviewForm;
