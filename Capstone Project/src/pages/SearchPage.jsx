import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const SearchPage = () => {
  const [games, setGames] = useState([]); // Full list of games
  const [filteredGames, setFilteredGames] = useState([]); // Filtered games to display
  const [searchQuery, setSearchQuery] = useState(""); // Search input state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/games");
        if (!response.ok) throw new Error("Failed to fetch games");
        const data = await response.json();
        console.log("Fetched Games:", data); // Debugging
        setGames(data);
        setFilteredGames(data); // Initialize filteredGames with all games
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // Update the filtered games list whenever the search query changes
  useEffect(() => {
    setFilteredGames(
      games.filter((game) =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, games]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Game Reviews</h1>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search games..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          padding: "10px",
          marginBottom: "20px",
          width: "100%",
          maxWidth: "400px",
        }}
      />

      {/* Games List */}
      <ul>
        {filteredGames.map((game) => (
          <li key={game.id}>
            <h2>
              <Link to={`/games/${game.id}`}>{game.title}</Link>
            </h2>
            <p>{game.description}</p>
            <p>
              Average Rating:{" "}
              {typeof game.average_rating === "number"
                ? game.average_rating.toFixed(2)
                : "No ratings yet"}
            </p>
          </li>
        ))}
      </ul>

      {/* No Results Message */}
      {filteredGames.length === 0 && <p>No games match your search.</p>}
    </div>
  );
};

export default SearchPage;

