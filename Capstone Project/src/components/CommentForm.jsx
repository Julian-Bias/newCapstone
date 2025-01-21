import React, { useState } from "react";

const CommentForm = ({ reviewId, onCommentSubmit }) => {
  const [commentText, setCommentText] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to comment");

      const formData = new FormData();
      formData.append("review_id", reviewId);
      formData.append("comment_text", commentText);
      if (image) formData.append("image", image);

      const response = await fetch("http://localhost:3000/api/comments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to post comment");

      const newComment = await response.json();
      setError(null);
      onCommentSubmit(newComment);
      setCommentText("");
      setImage(null); // Clear the file input
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
      <label>
        Upload Image:
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />
      </label>
      <button type="submit">Post Comment</button>
    </form>
  );
};

export default CommentForm;
