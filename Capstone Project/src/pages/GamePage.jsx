import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ReviewForm from "../components/ReviewForm";

const GamePage = () => {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGamePage = async () => {
      try {
        const response = await fetch(`/api/games/${id}`);
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
            <p>
              <strong>{review.username}:</strong> {review.review_text}
            </p>
            <p>Rating: {review.rating}</p>
          </div>
        ))
      ) : (
        <p>No reviews yet. Be the first to write one!</p>
      )}

      {/* Review Form */}
      <ReviewForm gameId={id} onReviewSubmit={handleNewReview} />
      <ReportButton reviewId={review.id} />
    </div>
  );
};

export default GamePage;
