import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ReviewForm from "../components/ReviewForm";
import CommentForm from "../components/CommentForm";

const GamePage = () => {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCommentForm, setShowCommentForm] = useState({});
  const [editingReview, setEditingReview] = useState(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(1);
  const [editingComment, setEditingComment] = useState(null); // Track editing comment

  const userId = localStorage.getItem("userId");

  // Add new review to state
  const handleNewReview = (newReview) => {
    setReviews((prevReviews) => {
      if (prevReviews.some((review) => review.id === newReview.id)) {
        console.warn("Duplicate review detected. Skipping addition.");
        return prevReviews;
      }
      return [...prevReviews, newReview];
    });
  };

  // Add new comment to state
  const handleNewComment = (reviewId, newComment) => {
    setComments((prevComments) => ({
      ...prevComments,
      [reviewId]: [...(prevComments[reviewId] || []), newComment],
    }));
  };

  // Fetch comments for a specific review
  const fetchComments = async (reviewId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/reviews/${reviewId}/comments`
      );
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();
      setComments((prevComments) => ({
        ...prevComments,
        [reviewId]: data,
      }));
    } catch (err) {
      console.error("Error fetching comments:", err.message);
    }
  };

  // Fetch game details, reviews, and associated comments
  useEffect(() => {
    const fetchGamePage = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/games/${id}`);
        if (!response.ok) throw new Error("Failed to fetch game details");

        const data = await response.json();
        setGame(data.game);
        setReviews(data.reviews);

        // Fetch comments for each review
        data.reviews.forEach((review) => fetchComments(review.id));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGamePage();
  }, [id]);

  // Edit a comment
  const handleEditComment = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to edit a comment");

      const response = await fetch(
        `http://localhost:3000/api/comments/${editingComment.commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comment_text: editingComment.commentText }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to edit comment");
      }

      const updatedComment = await response.json();
      setComments((prevComments) => ({
        ...prevComments,
        [updatedComment.review_id]: prevComments[updatedComment.review_id].map(
          (comment) =>
            comment.id === updatedComment.id ? updatedComment : comment
        ),
      }));

      setEditingComment(null);
    } catch (err) {
      console.error("Error editing comment:", err.message);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("You must be logged in to delete a comment");

      const response = await fetch(
        `http://localhost:3000/api/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      setComments((prevComments) => {
        const updatedComments = { ...prevComments };
        Object.keys(updatedComments).forEach((reviewId) => {
          updatedComments[reviewId] = updatedComments[reviewId].filter(
            (comment) => comment.id !== commentId
          );
        });
        return updatedComments;
      });
    } catch (err) {
      console.error("Error deleting comment:", err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{game.title}</h1>
      <img src={game.image_url} alt={game.title} />
      <p>Game Description:<br></br>{game.description}</p>
      <p>Category: {game.category_name}</p>
      <p>Average Rating: {game.average_rating ? parseFloat(game.average_rating).toFixed(2) : "No ratings yet"}</p>

      <h2>Reviews</h2>
      {reviews.length > 0 ? (
        reviews.map((review) => (
          <div key={review.id} className="review-card">
            <p>
              <strong>{review.username}:</strong> {review.review_text}
            </p>
            <p>Rating: {review.rating}</p>
            {comments[review.id]?.length > 0 ? (
              comments[review.id].map((comment) => (
                <div key={comment.id}>
                  {editingComment?.commentId === comment.id ? (
                    <div>
                      <textarea
                        value={editingComment.commentText}
                        onChange={(e) =>
                          setEditingComment({
                            ...editingComment,
                            commentText: e.target.value,
                          })
                        }
                      />
                      <button onClick={handleEditComment}>Save</button>
                      <button onClick={() => setEditingComment(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p>
                      <strong>{comment.username}:</strong>{" "}
                      {comment.comment_text}
                    </p>
                  )}
                  {String(userId) === String(comment.user_id) && (
                    <div>
                      <button
                        onClick={() =>
                          setEditingComment({
                            commentId: comment.id,
                            commentText: comment.comment_text,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDeleteComment(comment.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No comments yet.</p>
            )}
            <button
              onClick={() =>
                setShowCommentForm((prev) => ({
                  ...prev,
                  [review.id]: !prev[review.id],
                }))
              }
            >
              {showCommentForm[review.id] ? "Hide Comment Box" : "Comment"}
            </button>
            {showCommentForm[review.id] && (
              <CommentForm
                reviewId={review.id}
                onCommentSubmit={(newComment) =>
                  handleNewComment(review.id, newComment)
                }
              />
            )}
          </div>
        ))
      ) : (
        <p>No reviews yet. Be the first to write one!</p>
      )}

      <ReviewForm gameId={id} onReviewSubmit={handleNewReview} />
    </div>
  );
};

export default GamePage;
