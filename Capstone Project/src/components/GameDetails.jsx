import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const GameDetails = () => {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameDetails = async () => {
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

    fetchGameDetails();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{game.title}</h1>
      <p>{game.description}</p>
      <p>Average Rating: {game.average_rating.toFixed(2)}</p>
      <h2>Reviews</h2>
      <ul>
        {reviews.map((review) => (
          <li key={review.id}>
            <p>{review.review_text}</p>
            <p>Rating: {review.rating}</p>
            <p>By: {review.username}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GameDetails;
