"use client";

import { useState, useEffect, useRef } from "react";
import { User, MessageCircle, Send, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/types";

interface Comment {
  id: number;
  video_id: number;
  name: string;
  content: string;
  created_at: string;
}

export default function Comments({ videoId }: { videoId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const initialLoad = useRef(false);

  useEffect(() => {
    // Load saved name from local storage
    const savedName = localStorage.getItem("kinktube_comment_name");
    if (savedName) setName(savedName);

    // Fetch comments
    const fetchComments = async () => {
      if (!videoId) return;
      try {
        const res = await fetch(`/api/videos/${videoId}/comments?limit=50`);
        if (!res.ok) throw new Error("Failed to fetch comments");
        const data = await res.json();
        setComments(data.comments || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (!initialLoad.current) {
      initialLoad.current = true;
      fetchComments();
    }
  }, [videoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const currentName = name.trim() || "Anonymous";
      if (currentName !== "Anonymous") {
        localStorage.setItem("kinktube_comment_name", currentName);
      }

      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: currentName, content }),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      const newComment = await res.json();
      
      setComments((prev) => [newComment, ...prev]);
      setContent("");
    } catch (err: any) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background-secondary rounded-xl p-4 sm:p-6 border border-border">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-accent" />
        Comments ({comments.length})
      </h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-md">{error}</div>}
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-medium text-foreground-muted mb-1">Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-foreground-muted" />
              </div>
              <input
                type="text"
                placeholder="Anonymous"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full bg-background border border-border rounded-lg py-2 pl-9 pr-3 text-foreground focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          
          <div className="w-full sm:w-2/3">
            <label className="block text-sm font-medium text-foreground-muted mb-1">Comment</label>
            <div className="relative">
              <textarea
                placeholder="Leave a comment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={1000}
                rows={1}
                className="w-full bg-background border border-border rounded-lg py-2 pl-3 pr-12 text-foreground focus:outline-none focus:border-accent transition-colors resize-none overflow-hidden min-h-[42px]"
                style={{ height: content ? "auto" : "42px" }}
              />
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="absolute right-2 bottom-2 p-1.5 text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center flex-shrink-0 border border-border">
                <User className="w-5 h-5 text-foreground-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-foreground text-sm">{comment.name}</span>
                  <span className="text-xs text-foreground-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-foreground-muted leading-relaxed break-words whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-foreground-muted">
          <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  );
}
