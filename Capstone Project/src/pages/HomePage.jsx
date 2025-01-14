import React, { useState, useEffect } from "react";
import GameList from "../components/GameList";

const HomePage = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch("/api/games");
        const data = await response.json();
        setGames(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching games:", error);
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  return (
    <main>
      <h1>Game Reviews</h1>
      {loading ? <p>Loading games...</p> : <GameList games={games} />}
    </main>
  );
};

export default HomePage;
