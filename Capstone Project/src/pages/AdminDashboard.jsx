import React, { useState, useEffect } from "react";

const AdminDashboard = () => {
  const [categories, setCategories] = useState([]);
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  // Form states
  const [newCategory, setNewCategory] = useState("");
  const [newGame, setNewGame] = useState({
    title: "",
    description: "",
    categoryId: "",
    imageUrl: "",
  });
  const [editGame, setEditGame] = useState(null);
  const [editGameData, setEditGameData] = useState({
    title: "",
    description: "",
    categoryId: "",
    imageUrl: "",
  });

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem("token");

        // Fetch categories
        const categoriesResponse = await fetch(
          "http://localhost:3000/api/categories",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Fetch games
        const gamesResponse = await fetch("http://localhost:3000/api/games", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const gamesData = await gamesResponse.json();
        setGames(gamesData);

        // Fetch users
        const usersResponse = await fetch("http://localhost:3000/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const usersData = await usersResponse.json();
        setUsers(usersData);
      } catch (err) {
        setError("Failed to fetch admin data.");
        console.error(err);
      }
    };

    fetchAdminData();
  }, []);

  // Handle adding a category
  const handleAddCategory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategory }),
      });

      if (!response.ok) throw new Error("Failed to add category");

      const addedCategory = await response.json();
      setCategories((prev) => [...prev, addedCategory]);
      setNewCategory("");
    } catch (err) {
      setError("Failed to add category.");
      console.error(err);
    }
  };

  // Handle deleting a category
  const handleDeleteCategory = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:3000/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories((prev) => prev.filter((category) => category.id !== id));
    } catch (err) {
      setError("Failed to delete category.");
      console.error(err);
    }
  };

  // Handle adding a game
  const handleAddGame = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newGame.title,
          description: newGame.description,
          category_id: newGame.categoryId,
          image_url: newGame.imageUrl,
        }),
      });

      if (!response.ok) throw new Error("Failed to add game");

      const addedGame = await response.json();
      setGames((prev) => [...prev, addedGame]);
      setNewGame({ title: "", description: "", categoryId: "", imageUrl: "" });
    } catch (err) {
      setError("Failed to add game.");
      console.error(err);
    }
  };

  // Handle editing a game
  const handleSaveEditGame = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/games/${editGame.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editGameData.title,
            description: editGameData.description,
            category_id: editGameData.categoryId,
            image_url: editGameData.imageUrl,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to edit game");

      const updatedGame = await response.json();
      setGames((prevGames) =>
        prevGames.map((game) =>
          game.id === updatedGame.id
            ? { ...updatedGame, category_name: categoryName }
            : game
        )
      );
      setEditGame(null);
    } catch (err) {
      setError("Failed to edit game.");
      console.error(err);
    }
  };

  // Handle deleting a game
  const handleDeleteGame = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:3000/api/games/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setGames((prev) => prev.filter((game) => game.id !== id));
    } catch (err) {
      setError("Failed to delete game.");
      console.error(err);
    }
  };

  // Handle promoting/demoting a user
  const handleChangeUserRole = async (id, role) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/users/${id}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        }
      );

      if (!response.ok) throw new Error("Failed to update user role");

      const updatedUser = await response.json();
      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
    } catch (err) {
      setError("Failed to update user role.");
      console.error(err);
    }
  };

  // Handle deleting a user
  const handleDeleteUser = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:3000/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      setError("Failed to delete user.");
      console.error(err);
    }
  };

  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Admin Dashboard</h1>

      {/* Categories Management */}
      <section>
        <h2>Manage Categories</h2>
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name"
        />
        <button onClick={handleAddCategory}>Add Category</button>
        <ul>
          {categories.map((category) => (
            <li key={category.id}>
              {category.name}
              <button onClick={() => handleDeleteCategory(category.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Games Management */}
      <section>
        <h2>Manage Games</h2>
        <input
          type="text"
          value={newGame.title}
          onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
          placeholder="Title"
        />
        <input
          type="text"
          value={newGame.description}
          onChange={(e) =>
            setNewGame({ ...newGame, description: e.target.value })
          }
          placeholder="Description"
        />
        <select
          value={newGame.categoryId}
          onChange={(e) =>
            setNewGame({ ...newGame, categoryId: e.target.value })
          }
        >
          <option value="">Select Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newGame.imageUrl}
          onChange={(e) => setNewGame({ ...newGame, imageUrl: e.target.value })}
          placeholder="Image URL"
        />
        <button onClick={handleAddGame}>Add Game</button>
        <ul>
          {games.map((game) => (
            <li key={game.id}>
              {game.title} (Category: {game.category_name || "No Category Yet"})
              <button onClick={() => setEditGame(game)}>Edit</button>
              <button onClick={() => handleDeleteGame(game.id)}>Delete</button>
            </li>
          ))}
        </ul>
        {editGame && (
          <div>
            <h3>Edit Game</h3>
            <input
              type="text"
              value={editGameData.title}
              onChange={(e) =>
                setEditGameData({ ...editGameData, title: e.target.value })
              }
              placeholder="Title"
            />
            <input
              type="text"
              value={editGameData.description}
              onChange={(e) =>
                setEditGameData({
                  ...editGameData,
                  description: e.target.value,
                })
              }
              placeholder="Description"
            />
            <select
              value={editGameData.categoryId}
              onChange={(e) =>
                setEditGameData({ ...editGameData, categoryId: e.target.value })
              }
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={editGameData.imageUrl}
              onChange={(e) =>
                setEditGameData({ ...editGameData, imageUrl: e.target.value })
              }
              placeholder="Image URL"
            />
            <button onClick={handleSaveEditGame}>Save Changes</button>
            <button onClick={() => setEditGame(null)}>Cancel</button>
          </div>
        )}
      </section>

      {/* Users Management */}
      <section>
        <h2>Manage Users</h2>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.username} ({user.role})
              {user.role !== "admin" && (
                <button onClick={() => handleChangeUserRole(user.id, "admin")}>
                  Promote to Admin
                </button>
              )}
              {user.role === "admin" && (
                <button onClick={() => handleChangeUserRole(user.id, "user")}>
                  Demote to User
                </button>
              )}
              <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminDashboard;
