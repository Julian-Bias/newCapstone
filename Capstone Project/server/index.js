require("dotenv").config();
const express = require("express");
const path = require("path");
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const uuid = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

// Middleware
app.use(express.json());

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  console.log("authenticateToken middleware triggered");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Serve React App in Production ---
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React app's build folder
  app.use(express.static(path.join(__dirname, "../dist")));

  // Catch-all route to serve React's index.html for non-API requests
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

// --- Public Routes ---

//  Get all games
app.get("/api/games", async (req, res) => {
  const { search } = req.query; // Get the optional 'search' query parameter

  try {
    let query = "SELECT * FROM games";
    const values = [];

    // If there's a search term, add a WHERE clause for filtering by name
    if (search) {
      query += " WHERE LOWER(title) LIKE $1";
      values.push(`%${search.toLowerCase()}%`);
    }

    const result = await db.client.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching games:", err.message);
    res.status(500).send("Error fetching games");
  }
});

//  Get game details
app.get("/api/games/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const game = await db.client.query(
      `
      SELECT g.*, c.name AS category_name,
             (SELECT AVG(rating) FROM reviews WHERE game_id = $1) AS average_rating
      FROM games g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.id = $1
      `,
      [id]
    );

    const reviews = await db.client.query(
      `
      SELECT r.*, u.username, r.user_id
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.game_id = $1
      `,
      [id]
    );

    res.json({ game: game.rows[0], reviews: reviews.rows });
  } catch (err) {
    console.error("Error fetching game details:", err);
    res.status(500).json({ error: "Failed to fetch game details" });
  }
});

// Get games with search and filter
// app.get("/api/games", async (req, res) => {
//   const { search, category } = req.query;
//   try {
//     let SQL = `
//       SELECT g.*, c.name AS category_name,
//              (SELECT AVG(rating) FROM reviews WHERE game_id = g.id) AS average_rating
//       FROM games g
//       LEFT JOIN categories c ON g.category_id = c.id
//     `;
//     const params = [];

//     if (search || category) {
//       SQL += " WHERE";
//       if (search) {
//         SQL += " LOWER(g.title) LIKE $1";
//         params.push(`%${search.toLowerCase()}%`);
//       }
//       if (category) {
//         if (params.length > 0) SQL += " AND";
//         SQL += " c.id = $2";
//         params.push(category);
//       }
//     }

//     const games = await db.client.query(SQL, params);
//     res.json(games.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching games");
//   }
// });

//  Register a new user
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.createUser({
      username,
      email,
      password_hash: hashedPassword,
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("Error in /api/register:", err);

    // Handle duplicate key errors (e.g., unique constraints)
    if (err.code === "23505") {
      // PostgreSQL unique violation
      return res
        .status(400)
        .json({ message: "Email or username already exists" });
    }

    res.status(500).json({ message: "Server error" });
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
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        email: user.rows[0].email,
      },
    });
  } catch (err) {
    console.error("Login Error:", err.message);
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

// Fetch all users **Admin Only
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    // Ensure only admin users can access this route
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Query to fetch all users
    const SQL = `
      SELECT id, username, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    const result = await db.client.query(SQL);

    // Return the list of users
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// --- Protected Routes ---

// Get a users comments
app.get("/api/users/:id/comments", authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Check if the logged-in user matches the requested user or is an admin
  if (req.user.id !== id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const comments = await db.client.query(
      `
      SELECT c.id, c.comment_text, c.review_id, c.user_id, r.review_text 
      FROM comments c
      JOIN reviews r ON c.review_id = r.id
      WHERE c.user_id = $1
      `,
      [id]
    );
    res.json(comments.rows);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ message: "Error fetching comments" });
  }
});

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
  const { review_text, rating } = req.body;

  try {
    const result = await db.client.query(
      `
      UPDATE reviews
      SET review_text = $1, rating = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *;
      `,
      [review_text, rating, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Review not found or unauthorized" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error editing review:", err);
    res.status(500).json({ message: "Error editing review" });
  }
});

// Fetch user reviews
app.get("/api/users/:id/reviews", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).send("Access denied");
    }

    const SQL = `
      SELECT r.id, r.review_text, r.rating, r.game_id, g.title AS game_title
      FROM reviews r
      JOIN games g ON r.game_id = g.id
      WHERE r.user_id = $1
    `;
    const reviews = await db.client.query(SQL, [id]);
    res.json(reviews.rows);
  } catch (err) {
    console.error("Error fetching user reviews:", err.message);
    res.status(500).send("Failed to fetch reviews");
  }
});

// Edit a review
// app.put("/api/reviews/:id", authenticateToken, async (req, res) => {
//   const { id } = req.params;
//   const { review_text, rating } = req.body;

//   try {
//     const result = await db.client.query(
//       `
//       UPDATE reviews
//       SET review_text = $1, rating = $2
//       WHERE id = $3 AND user_id = $4
//       RETURNING *;
//       `,
//       [review_text, rating, id, req.user.id]
//     );

//     if (result.rows.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "Review not found or unauthorized" });
//     }

//     res.json(result.rows[0]); // Return the updated review
//   } catch (err) {
//     console.error("Error editing review:", err);
//     res.status(500).json({ message: "Error editing review" });
//   }
// });

//  Delete a review
app.delete("/api/reviews/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.client.query(
      `
      DELETE FROM reviews
      WHERE id = $1 AND user_id = $2
      RETURNING *;
      `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Review not found or unauthorized" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Error deleting review:", err);
    res.status(500).json({ message: "Error deleting review" });
  }
});

//  Add a comment to a review
app.post("/api/comments", authenticateToken, async (req, res) => {
  console.log("POST /api/comments triggered");
  const { review_id, comment_text } = req.body;

  try {
    const result = await db.client.query(
      `
      INSERT INTO comments (id, review_id, user_id, comment_text)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [uuid.v4(), review_id, req.user.id, comment_text]
    );
    console.log("Incoming data:", {
      review_id,
      comment_text,
      user_id: req.user.id,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding comment:", err.message);
    res.status(500).send("Failed to add comment");
  }
});

// Get All comments on a review
app.get("/api/reviews/:id/comments", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.client.query(
      `
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.review_id = $1
      `,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching comments:", err.message);
    res.status(500).send("Failed to fetch comments");
  }
});

//Get comments for all reviews to display
app.get("/api/comments", async (req, res) => {
  try {
    const result = await db.client.query(
      `
      SELECT comments.*, users.username
      FROM comments
      JOIN users ON comments.user_id = users.id
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all comments:", err.message);
    res.status(500).send("Failed to fetch comments");
  }
});

//Edit User Comment
app.put("/api/comments/:commentId", authenticateToken, async (req, res) => {
  const { commentId } = req.params;
  const { comment_text } = req.body;

  try {
    const result = await db.client.query(
      `
      UPDATE comments
      SET comment_text = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
      `,
      [comment_text, commentId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Comment not found or not authorized" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error editing comment:", err.message);
    res.status(500).send("Failed to edit comment");
  }
});

//  Delete a comment
app.delete("/api/comments/:commentId", authenticateToken, async (req, res) => {
  const { commentId } = req.params;

  try {
    const result = await db.client.query(
      `
      DELETE FROM comments
      WHERE id = $1 AND user_id = $2
      RETURNING *
      `,
      [commentId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Comment not found or not authorized" });
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error deleting comment:", err.message);
    res.status(500).send("Failed to delete comment");
  }
});

// --- Start the Server ---
app.listen(PORT, async () => {
  try {
    await db.client.connect();
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (err) {
    console.error("Error connecting to the database:", err);
  }
});
