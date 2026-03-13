"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { REJECTION_REASONS } from "@/lib/constants";

interface RejectionModalProps {
  candidateId: string;
  candidateName: string;
  onConfirm: (reason: string, message: string) => void;
  onCancel: () => void;
}

export function RejectionModal({
  candidateId,
  candidateName,
  onConfirm,
  onCancel,
}: RejectionModalProps) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [customReason, setCustomReason] = useState("");

  const activeReason = reason === "Other" ? customReason : reason;
  const canSubmit = activeReason.trim().length > 0;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(activeReason.trim(), message.trim());
  };

  const handleCopyAndConfirm = () => {
    if (!canSubmit) return;
    if (message.trim()) {
      navigator.clipboard.writeText(message.trim()).catch(() => {});
    }
    onConfirm(activeReason.trim(), message.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Reject {candidateName}
          </h3>
          <button
            onClick={onCancel}
            className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Reason chips */}
        <div className="mb-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 block">
            Reason
          </label>
          <div className="flex flex-wrap gap-2">
            {REJECTION_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  reason === r
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {reason === "Other" && (
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Specify reason..."
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none"
              autoFocus
            />
          )}
        </div>

        {/* Message compose */}
        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 block">
            Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a rejection message to copy or save internally..."
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-blue-300 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Internally
          </button>
          {message.trim() && (
            <button
              onClick={handleCopyAndConfirm}
              disabled={!canSubmit}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Copy Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
