require("dotenv").config();
const express = require("express");
const path = require("path");
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const uuid = require("uuid");
const multer = require("multer");

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

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Specify the folder for uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// --- Serve React App in Production ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
  const { search } = req.query;

  try {
    let query = `
      SELECT g.id, g.title, g.description, g.image_url, c.name AS category_name,
             COALESCE(ROUND((SELECT AVG(rating) FROM reviews WHERE game_id = g.id), 2), 0) AS average_rating
      FROM games g
      LEFT JOIN categories c ON g.category_id = c.id
    `;
    const values = [];

    if (search) {
      query += " WHERE LOWER(g.title) LIKE $1";
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
    const user = await db.client.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (
      user.rows.length === 0 ||
      !(await bcrypt.compare(password, user.rows[0].password_hash))
    ) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Include role in the JWT
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
        role: user.rows[0].role, // Include role here
      },
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "Error logging in" });
  }
});

// --- Admin Routes ---
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

// Fetch all dashboard data (Admin Only)
app.get("/api/admin/dashboard", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const users = await db.client.query(
      "SELECT id, username, email, role FROM users"
    );
    const games = await db.fetchGames();
    const categories = await db.fetchCategories();
    const reviews = await db.fetchReviews();

    res.json({
      users: users.rows,
      games,
      categories,
      reviews,
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err.message);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
});

// Promote a user to admin (Admin Only)
app.put("/api/users/:id/role", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).send("Access denied");

  const { id } = req.params;
  const { role } = req.body;

  try {
    const result = await db.client.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING *`,
      [role, id]
    );

    if (result.rows.length === 0) return res.status(404).send("User not found");

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating user role:", err.message);
    res.status(500).send("Error updating user role");
  }
});

// Delete a User
app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).send("Access denied");

  const { id } = req.params;

  try {
    const result = await db.client.query(
      `DELETE FROM users WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).send("User not found");

    res.status(204).send();
  } catch (err) {
    console.error("Error deleting user:", err.message);
    res.status(500).send("Error deleting user");
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

// Fetch all categories
app.get("/api/categories", authenticateToken, async (req, res) => {
  try {
    const categories = await db.fetchCategories();
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err.message);
    res.status(500).send("Error fetching categories");
  }
});

// Add a new game
app.post("/api/games", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { title, description, category_id, image_url } = req.body;

  try {
    const SQL = `
      INSERT INTO games (id, title, description, category_id, image_url, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      uuid.v4(),
      title,
      description,
      category_id,
      image_url,
      req.user.id,
    ];
    const result = await db.client.query(SQL, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding game:", err.message);
    res.status(500).json({ message: "Error adding game" });
  }
});

// Update a game
app.put("/api/games/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { id } = req.params;
  const { title, description, category_id, image_url } = req.body;

  if (!title || !description || !category_id || !image_url) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const SQL = `
      UPDATE games
      SET title = $1, description = $2, category_id = $3, image_url = $4
      WHERE id = $5
      RETURNING *;
    `;
    const values = [title, description, category_id, image_url, id];

    const result = await db.client.query(SQL, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Game not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating game:", err.message);
    res.status(500).json({ message: "Error updating game" });
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
app.post(
  "/api/reviews",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    const { game_id, rating, review_text } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const review = await db.createReview({
        game_id,
        user_id: req.user.id,
        rating,
        review_text,
        image_url: imageUrl,
      });

      res.status(201).json(review);
    } catch (err) {
      console.error("Error creating review:", err.message);
      res.status(500).send("Error creating review");
    }
  }
);

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
app.post(
  "/api/comments",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    console.log("POST /api/comments triggered");

    const { review_id, comment_text } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const result = await db.client.query(
        `
      INSERT INTO comments (id, review_id, user_id, comment_text, image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
        [uuid.v4(), review_id, req.user.id, comment_text, imageUrl]
      );

      console.log("Incoming data:", {
        review_id,
        comment_text,
        imageUrl,
        user_id: req.user.id,
      });

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error adding comment:", err.message);
      res.status(500).send("Failed to add comment");
    }
  }
);

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
