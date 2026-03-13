"use client";

import { useState, useTransition, useEffect } from "react";
import { Send, Pencil, Check, X } from "lucide-react";
import {
  createComment,
  editComment,
  getComments,
} from "@/lib/actions/comments";
import { MOCK_USER } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import type { CandidateComment } from "@/types";

interface CommentThreadProps {
  candidateId: string;
}

function canEdit(comment: CandidateComment): boolean {
  if (comment.createdBy !== MOCK_USER.name) return false;
  const fiveMin = 5 * 60 * 1000;
  return Date.now() - new Date(comment.createdAt).getTime() < fiveMin;
}

function CommentItem({
  comment,
  onEdited,
}: {
  comment: CandidateComment;
  onEdited: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [isPending, startTransition] = useTransition();

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    startTransition(async () => {
      const result = await editComment(comment.id, editText);
      if ("success" in result) {
        setIsEditing(false);
        onEdited();
      }
    });
  };

  return (
    <div className="flex gap-2">
      {/* Avatar */}
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-xs font-medium text-blue-700">
          {comment.createdBy.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            {comment.createdBy}
          </span>
          <span className="text-xs text-gray-400">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {comment.editedAt && (
            <span className="text-xs text-gray-300">(edited)</span>
          )}
          {canEdit(comment) && !isEditing && (
            <button
              onClick={() => {
                setEditText(comment.body);
                setIsEditing(true);
              }}
              className="text-gray-300 hover:text-gray-500 transition-colors"
              title="Edit comment"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 flex items-center gap-1">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-300 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              autoFocus
              disabled={isPending}
            />
            <button
              onClick={handleSaveEdit}
              disabled={isPending}
              className="p-1 text-green-600 hover:text-green-700"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mt-0.5 break-words">
            {comment.body}
          </p>
        )}
      </div>
    </div>
  );
}

export function CommentThread({ candidateId }: CommentThreadProps) {
  const [comments, setComments] = useState<CandidateComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const loadComments = () => {
    startTransition(async () => {
      const data = await getComments(candidateId);
      setComments(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadComments();
  }, [candidateId]);

  const handlePost = () => {
    if (!newComment.trim()) return;
    startTransition(async () => {
      const result = await createComment(candidateId, newComment);
      if ("success" in result) {
        setNewComment("");
        loadComments();
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        <div className="h-4 w-24 rounded bg-gray-100" />
        <div className="h-4 w-full rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Comment input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-300 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handlePost();
            }
          }}
          disabled={isPending}
        />
        <button
          onClick={handlePost}
          disabled={isPending || !newComment.trim()}
          className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-xs text-gray-400 italic text-center py-2">
          No comments yet
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onEdited={loadComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
