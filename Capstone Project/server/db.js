require("dotenv").config();
const pg = require("pg");
const uuid = require("uuid");

// Create PostgreSQL client
const client = new pg.Client(process.env.DATABASE_URL);

// Function to create tables
const createTables = async () => {
  const SQL = /*sql*/ `
    DROP TABLE IF EXISTS comments CASCADE;
    DROP TABLE IF EXISTS reviews CASCADE;
    DROP TABLE IF EXISTS games CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;

    CREATE TABLE users (
        id UUID PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE categories (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
    );

    CREATE TABLE games (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category_id UUID REFERENCES categories(id),
        image_url TEXT NOT NULL,
        owner_id UUID REFERENCES users(id),
        average_rating DECIMAL(3,2) DEFAULT 0.00
    );

    CREATE TABLE reviews (
        id UUID PRIMARY KEY,
        game_id UUID REFERENCES games(id),
        user_id UUID REFERENCES users(id),
        rating INT CHECK (rating BETWEEN 1 AND 5),
        review_text TEXT NOT NULL
    );

    CREATE TABLE comments (
        id UUID PRIMARY KEY,
        review_id UUID REFERENCES reviews(id),
        user_id UUID REFERENCES users(id),
        comment_text TEXT NOT NULL
    );
  `;
  await client.query(SQL);
};

// Insert functions
const createUser = async ({
  username,
  email,
  password_hash,
  role = "user",
}) => {
  const SQL = `
    INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    email,
    password_hash,
    role,
  ]);
  return response.rows[0];
};

const createCategory = async (name) => {
  const SQL = `
    INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), name]);
  return response.rows[0];
};

const createGame = async ({
  title,
  description,
  category_id,
  image_url,
  owner_id,
}) => {
  const SQL = `
    INSERT INTO games (id, title, description, category_id, image_url, owner_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    title,
    description,
    category_id,
    image_url,
    owner_id,
  ]);
  return response.rows[0];
};

const createReview = async ({ game_id, user_id, rating, review_text }) => {
  const SQL = `
    INSERT INTO reviews (id, game_id, user_id, rating, review_text) VALUES ($1, $2, $3, $4, $5) RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    game_id,
    user_id,
    rating,
    review_text,
  ]);
  return response.rows[0];
};

const createComment = async ({ review_id, user_id, comment_text }) => {
  const SQL = `
    INSERT INTO comments (id, review_id, user_id, comment_text) VALUES ($1, $2, $3, $4) RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    review_id,
    user_id,
    comment_text,
  ]);
  return response.rows[0];
};

// Fetch functions
const fetchUsers = async () => {
  const SQL = `
    SELECT * FROM users
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchGames = async () => {
  const SQL = `
    SELECT * FROM games
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchReviews = async () => {
  const SQL = `
    SELECT * FROM reviews
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchComments = async () => {
  const SQL = `
    SELECT * FROM comments
  `;
  const response = await client.query(SQL);
  return response.rows;
};

// Delete functions
const deleteReview = async (id) => {
  const SQL = `
    DELETE FROM reviews WHERE id = $1
  `;
  await client.query(SQL, [id]);
};

const deleteComment = async (id) => {
  const SQL = `
    DELETE FROM comments WHERE id = $1
  `;
  await client.query(SQL, [id]);
};

// Export all functions
module.exports = {
  client,
  createTables,
  createUser,
  createCategory,
  createGame,
  createReview,
  createComment,
  fetchUsers,
  fetchGames,
  fetchReviews,
  fetchComments,
  deleteReview,
  deleteComment,
};
