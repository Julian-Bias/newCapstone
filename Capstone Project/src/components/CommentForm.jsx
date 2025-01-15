import React, { useState } from "react";

const CommentForm = ({ reviewId, onCommentSubmit }) => {
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to comment");

      const response = await fetch("http://localhost:3000/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ review_id: reviewId, comment_text: commentText }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      const newComment = await response.json();
      onCommentSubmit(newComment);
      setCommentText("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Write a comment..."
        required
      />
      <button type="submit">Post Comment</button>
    </form>
  );
};

export default CommentForm;
