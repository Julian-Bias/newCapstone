require("dotenv").config();
const express = require("express");
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Public Routes ---

//  Get all games
app.get("/api/games", async (req, res) => {
  try {
    const games = await db.fetchGames();
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching games");
  }
});

//  Get game details
app.get("/api/games/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const game = await db.client.query(
      `
      SELECT g.*, c.name as category_name, 
             (SELECT AVG(rating) FROM reviews WHERE game_id = $1) as average_rating
      FROM games g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.id = $1
    `,
      [id]
    );
    const reviews = await db.client.query(
      `
      SELECT r.*, u.username 
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.game_id = $1
    `,
      [id]
    );
    res.json({ game: game.rows[0], reviews: reviews.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching game details");
  }
});

// Get games with search and filter
app.get("/api/games", async (req, res) => {
  const { search, category } = req.query;
  try {
    let SQL = `
      SELECT g.*, c.name AS category_name, 
             (SELECT AVG(rating) FROM reviews WHERE game_id = g.id) AS average_rating
      FROM games g
      LEFT JOIN categories c ON g.category_id = c.id
    `;
    const params = [];

    if (search || category) {
      SQL += " WHERE";
      if (search) {
        SQL += " LOWER(g.title) LIKE $1";
        params.push(`%${search.toLowerCase()}%`);
      }
      if (category) {
        if (params.length > 0) SQL += " AND";
        SQL += " c.id = $2";
        params.push(category);
      }
    }

    const games = await db.client.query(SQL, params);
    res.json(games.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching games");
  }
});

//  Register a new user
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      username,
      email,
      password_hash: hashedPassword,
    });
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error registering user");
  }
});

// Fetch user profile
app.get("/api/users/me", authenticateToken, async (req, res) => {
  try {
    const SQL = `SELECT id, username, email, role, created_at FROM users WHERE id = $1`;
    const user = await db.client.query(SQL, [req.user.id]);
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching user profile");
  }
});

// Update user profile
app.put("/api/users/me", authenticateToken, async (req, res) => {
  const { username, email } = req.body;
  try {
    const SQL = `
      UPDATE users 
      SET username = $1, email = $2 
      WHERE id = $3 RETURNING id, username, email, role, created_at
    `;
    const result = await db.client.query(SQL, [username, email, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating user profile");
  }
});

//  Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.client.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    if (
      user.rows.length === 0 ||
      !(await bcrypt.compare(password, user.rows[0].password_hash))
    ) {
      return res.status(401).send("Invalid credentials");
    }
    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error logging in");
  }
});

// **Create a category **Admin
app.post("/api/categories", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).send("Access denied");

  const { name } = req.body;
  try {
    const category = await db.createCategory(name);
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating category");
  }
});

// **Edit a category **Admin
app.put("/api/categories/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).send("Access denied");

  const { id } = req.params;
  const { name } = req.body;

  try {
    const SQL = `
      UPDATE categories 
      SET name = $1 
      WHERE id = $2 RETURNING *
    `;
    const result = await db.client.query(SQL, [name, id]);

    if (result.rows.length === 0) {
      return res.status(404).send("Category not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error editing category");
  }
});

// **Delete a category **Admin
app.delete("/api/categories/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).send("Access denied");

  const { id } = req.params;

  try {
    const SQL = `
      DELETE FROM categories 
      WHERE id = $1 RETURNING *
    `;
    const result = await db.client.query(SQL, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send("Category not found");
    }

    res.status(204).send(); // No content to send back
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting category");
  }
});

// --- Protected Routes ---

//  Create a review
app.post("/api/reviews", authenticateToken, async (req, res) => {
  const { game_id, rating, review_text } = req.body;
  try {
    const review = await db.createReview({
      game_id,
      user_id: req.user.id,
      rating,
      review_text,
    });
    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating review");
  }
});

//  Edit a review
app.put("/api/reviews/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rating, review_text } = req.body;
  try {
    const result = await db.client.query(
      `
      UPDATE reviews 
      SET rating = $1, review_text = $2 
      WHERE id = $3 AND user_id = $4 RETURNING *
    `,
      [rating, review_text, id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).send("Review not found");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error editing review");
  }
});

// Fetch user reviews
app.get("/api/users/:id/reviews", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).send("Access denied");
    }

    const SQL = `
      SELECT r.*, g.title AS game_title
      FROM reviews r
      JOIN games g ON r.game_id = g.id
      WHERE r.user_id = $1
    `;
    const reviews = await db.client.query(SQL, [id]);
    res.json(reviews.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching user reviews");
  }
});

//  Delete a review
app.delete("/api/reviews/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.client.query(
      `DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).send("Review not found");
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting review");
  }
});

//  Add a comment to a review
app.post("/api/comments", authenticateToken, async (req, res) => {
  const { review_id, comment_text } = req.body;
  try {
    const comment = await db.createComment({
      review_id,
      user_id: req.user.id,
      comment_text,
    });
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding comment");
  }
});

//  Delete a comment
app.delete("/api/comments/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.client.query(
      `DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).send("Comment not found");
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting comment");
  }
});

// Start the server
app.listen(PORT, async () => {
  await db.client.connect();
  console.log(`Server is running on http://localhost:${PORT}`);
});
