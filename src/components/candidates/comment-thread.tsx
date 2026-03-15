"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { Send, Pencil, Check, X } from "lucide-react";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import {
  createComment,
  editComment,
  getComments,
  getMentionableMembers,
} from "@/lib/actions/comments";
import { getCurrentUserForAudit } from "@/lib/actions/get-current-user";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import type { CandidateComment } from "@/types";

type MentionableMember = { id: string; name: string };

interface CommentThreadProps {
  candidateId: string;
}

// ─── Mention helpers ────────────────────────────────────────────────────────

/**
 * Parse comment body for @mention tokens and render them as blue spans.
 * Non-mention parts are rendered as plain text.
 */
function renderCommentBody(body: string): React.ReactNode {
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, idx) => {
    if (/^@\w+$/.test(part)) {
      return (
        <span key={idx} className="text-blue-600 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Extract @mentions from a comment body.
 * Matches against the provided members list (DB team members or fallback constants).
 */
function extractMentions(
  body: string,
  members: ReadonlyArray<MentionableMember>,
): Array<{ userId: string; name: string }> {
  return members
    .filter((m) => body.includes(`@${m.name}`))
    .map((m) => ({ userId: m.id, name: m.name }));
}

// ─── CommentItem ─────────────────────────────────────────────────────────────

function canEdit(comment: CandidateComment, currentUserName: string): boolean {
  if (comment.createdBy !== currentUserName) return false;
  const fiveMin = 5 * 60 * 1000;
  return Date.now() - new Date(comment.createdAt).getTime() < fiveMin;
}

function CommentItem({
  comment,
  currentUserName,
  onEdited,
}: {
  comment: CandidateComment;
  currentUserName: string;
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
          {canEdit(comment, currentUserName) && !isEditing && (
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
            {renderCommentBody(comment.body)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── CommentThread ────────────────────────────────────────────────────────────

export function CommentThread({ candidateId }: CommentThreadProps) {
  const [comments, setComments] = useState<CandidateComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState("");

  // Team members for @mention (loaded from DB)
  const [mentionMembers, setMentionMembers] = useState<
    ReadonlyArray<MentionableMember>
  >([]);

  // @mention popover state
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionAnchorIdx, setMentionAnchorIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadComments = useCallback(() => {
    startTransition(async () => {
      const data = await getComments(candidateId);
      setComments(data);
      setIsLoading(false);
    });
  }, [candidateId]);

  // Load current user name + DB team members for @mention (once on mount)
  useEffect(() => {
    getCurrentUserForAudit()
      .then((u) => setCurrentUserName(u.name))
      .catch(() => {});
    getMentionableMembers()
      .then((members) => {
        if (members.length > 0) {
          setMentionMembers(members);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Real-time: reload comments when new ones are added/edited
  useRealtimeSubscription({
    table: "candidate_comments",
    filter: `candidate_id=eq.${candidateId}`,
    onChanged: loadComments,
    enabled: Boolean(candidateId),
  });

  // Detect @mention trigger on each keystroke
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setNewComment(value);

    const cursor = e.target.selectionStart ?? value.length;

    // Find the last @ before the cursor that hasn't been closed by a space
    const textBeforeCursor = value.slice(0, cursor);
    const atIdx = textBeforeCursor.lastIndexOf("@");

    if (atIdx !== -1) {
      const fragment = textBeforeCursor.slice(atIdx + 1);
      // Only show popover if no spaces after the @
      if (!fragment.includes(" ")) {
        setMentionAnchorIdx(atIdx);
        setMentionFilter(fragment.toLowerCase());
        setShowMentionPopover(true);
        return;
      }
    }

    setShowMentionPopover(false);
    setMentionFilter("");
    setMentionAnchorIdx(-1);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setShowMentionPopover(false);
    } else if (e.key === "Enter" && !showMentionPopover && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  }

  function selectMention(name: string) {
    // Replace the @partial text with @Name (space after)
    const before = newComment.slice(0, mentionAnchorIdx);
    const after = newComment.slice(mentionAnchorIdx + 1 + mentionFilter.length);
    const updated = `${before}@${name} ${after}`;
    setNewComment(updated);
    setShowMentionPopover(false);
    setMentionFilter("");
    setMentionAnchorIdx(-1);
    // Return focus to input
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const filteredMembers = mentionMembers.filter((m) =>
    m.name.toLowerCase().startsWith(mentionFilter),
  );

  const handlePost = () => {
    if (!newComment.trim()) return;
    const mentions = extractMentions(newComment, mentionMembers);
    startTransition(async () => {
      const result = await createComment(candidateId, newComment, mentions);
      if ("success" in result) {
        setNewComment("");
        setShowMentionPopover(false);
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
      {/* Comment input with @mention popover */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Add a comment... (type @ to mention)"
            maxLength={5000}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-300 focus:outline-none"
            disabled={isPending}
          />

          {/* @mention popover — absolute below input */}
          {showMentionPopover && filteredMembers.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-md">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent input blur before we can capture the click
                    e.preventDefault();
                    selectMention(member.name);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 text-left transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                    {member.name.charAt(0)}
                  </span>
                  {member.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handlePost}
          disabled={isPending || !newComment.trim()}
          className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={14} />
        </button>
      </div>
      {newComment.length > 4500 && (
        <p
          className={`text-xs ${newComment.length >= 5000 ? "text-red-500" : "text-gray-400"}`}
        >
          {newComment.length}/5000
        </p>
      )}

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
              currentUserName={currentUserName}
              onEdited={loadComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
