import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");

        const response = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch profile");

        const userData = await response.json();
        setUser(userData);

        // Fetch user reviews
        const reviewsResponse = await fetch(`/api/users/${userData.id}/reviews`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData);
        }

        // Fetch user comments
        const commentsResponse = await fetch(`/api/users/${userData.id}/comments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
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
                <p>
                  <strong>Game:</strong> {review.game_title}
                </p>
                <p>{review.review_text}</p>
                <p>Rating: {review.rating}</p>
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
