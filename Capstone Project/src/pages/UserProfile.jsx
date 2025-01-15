import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [editingReview, setEditingReview] = useState(null);
  const [editReviewText, setEditReviewText] = useState("");
  const [editRating, setEditRating] = useState(1);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");

        const response = await fetch("http://localhost:3000/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch profile");

        const userData = await response.json();
        setUser(userData);

        // Fetch user reviews
        const reviewsResponse = await fetch(
          `http://localhost:3000/api/users/${userData.id}/reviews`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData);
        }

        // Fetch user comments
        const commentsResponse = await fetch(
          `http://localhost:3000/api/users/${userData.id}/comments`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Handle editing a review
  const handleEditReview = (review) => {
    setEditingReview(review.id);
    setEditReviewText(review.review_text);
    setEditRating(review.rating);
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/reviews/${editingReview}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            review_text: editReviewText,
            rating: editRating,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update review");

      const updatedReview = await response.json();
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === updatedReview.id ? updatedReview : review
        )
      );

      setEditingReview(null);
      setEditReviewText("");
      setEditRating(1);
    } catch (err) {
      console.error("Error updating review:", err.message);
    }
  };

  // Handle deleting a review
  const handleDeleteReview = async (reviewId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/reviews/${reviewId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete review");

      setReviews((prevReviews) =>
        prevReviews.filter((review) => review.id !== reviewId)
      );
    } catch (err) {
      console.error("Error deleting review:", err.message);
    }
  };

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {user ? (
        <div>
          <h1>Welcome, {user.username}!</h1>
          <p>Email: {user.email}</p>
          <button onClick={handleLogout}>Logout</button>

          <h2>Your Reviews</h2>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="review-card">
                {editingReview === review.id ? (
                  <div>
                    <textarea
                      value={editReviewText}
                      onChange={(e) => setEditReviewText(e.target.value)}
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
                    <button onClick={() => setEditingReview(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <p>
                      <strong>Game:</strong> {review.game_title}
                    </p>
                    <p>{review.review_text}</p>
                    <p>Rating: {review.rating}</p>
                    <button onClick={() => handleEditReview(review)}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteReview(review.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>You haven’t written any reviews yet.</p>
          )}

          <h2>Your Comments</h2>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="comment-card">
                <p>{comment.comment_text}</p>
              </div>
            ))
          ) : (
            <p>You haven’t commented on any reviews yet.</p>
          )}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default UserProfile;
