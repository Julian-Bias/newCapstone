import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ReviewForm from "../components/ReviewForm";

const GamePage = () => {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(1);

  const userId = localStorage.getItem("userId"); // Get logged-in user's ID
  console.log("Retrieved User Id", userId);

  // Function to handle new review submission
  const handleNewReview = (newReview) => {
    setReviews((prevReviews) => {
      if (prevReviews.some((review) => review.id === newReview.id)) {
        console.warn("Duplicate review detected. Skipping addition.");
        return prevReviews;
      }
      return [...prevReviews, newReview];
    });
  };

  // Function to handle review deletion
  const handleDeleteReview = async (reviewId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to delete a review");

      const response = await fetch(
        `http://localhost:3000/api/reviews/${reviewId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete review");
      }

      setReviews((prevReviews) =>
        prevReviews.filter((review) => review.id !== reviewId)
      );
    } catch (err) {
      console.error("Error deleting review:", err.message);
    }
  };

  // Function to handle review editing
  const handleEditReview = (review) => {
    setEditingReview(review.id);
    setEditText(review.review_text);
    setEditRating(review.rating);
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to edit a review");

      const response = await fetch(
        `http://localhost:3000/api/reviews/${editingReview}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ review_text: editText, rating: editRating }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to edit review");
      }

      const updatedReview = await response.json();
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === updatedReview.id ? updatedReview : review
        )
      );
      setEditingReview(null);
      setEditText("");
      setEditRating(1);
    } catch (err) {
      console.error("Error editing review:", err.message);
    }
  };

  // Fetch game details and reviews
  useEffect(() => {
    const fetchGamePage = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/games/${id}`);
        if (!response.ok) throw new Error("Failed to fetch game details");

        const data = await response.json();
        setGame(data.game);
        setReviews(data.reviews);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGamePage();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Game details */}
      <h1>{game.title}</h1>
      <img src={game.image_url} alt={game.title} />
      <p>{game.description}</p>
      <p>Category: {game.category_name}</p>
      <p>Average Rating: {game.average_rating || "No ratings yet"}</p>

      <h2>Reviews</h2>
      {reviews.length > 0 ? (
        reviews.map((review) => (
          <div key={review.id} className="review-card">
            {editingReview === review.id ? (
              <div>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <select
                  value={editRating}
                  onChange={(e) => setEditRating(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <button onClick={handleSaveEdit}>Save</button>
                <button onClick={() => setEditingReview(null)}>Cancel</button>
              </div>
            ) : (
              <div>
                <p>
                  <strong>{review.username}:</strong> {review.review_text}
                </p>
                <p>Rating: {review.rating}</p>
                {String(userId) === String(review.user_id) && (
                  <div>
                    <button onClick={() => handleEditReview(review)}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteReview(review.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <p>No reviews yet. Be the first to write one!</p>
      )}

      {/* Review Form */}
      <ReviewForm gameId={id} onReviewSubmit={handleNewReview} />
    </div>
  );
};

export default GamePage;
