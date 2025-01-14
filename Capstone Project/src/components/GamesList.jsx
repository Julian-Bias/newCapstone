import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const GamesList = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch("/api/games");
        if (!response.ok) {
          throw new Error(
            `Error: ${response.status} ${response.statusText}`
          );
        }
        const data = await response.json();
        setGames(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="games-list">
      <h1>Game Reviews</h1>
      <ul className="games-list-container">
        {games.map((game) => (
          <li key={game.id} className="game-item">
            <h2>
              <Link to={`/games/${game.id}`}>{game.title}</Link>
            </h2>
            <p>{game.description}</p>
            <p>
              Average Rating:{" "}
              {game.average_rating !== null
                ? game.average_rating.toFixed(2)
                : "No ratings yet"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GamesList;
