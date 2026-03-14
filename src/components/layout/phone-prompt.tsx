"use client";

import { useState, useEffect } from "react";
import { Phone, X } from "lucide-react";
import { savePhoneNumber } from "@/lib/actions/team";

interface PhonePromptProps {
  userId: string;
  hasPhone: boolean;
}

/**
 * Shows a one-time prompt asking users to add their phone number
 * for WhatsApp notifications. Dismissible, only shows once per session.
 */
export function PhonePrompt({ userId, hasPhone }: PhonePromptProps) {
  const [visible, setVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Don't show if they already have a phone number
    if (hasPhone) return;

    // Only show once per session
    const dismissed = sessionStorage.getItem("phone-prompt-dismissed");
    if (dismissed) return;

    // Small delay so it doesn't flash immediately on load
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [hasPhone]);

  const handleDismiss = () => {
    sessionStorage.setItem("phone-prompt-dismissed", "1");
    setVisible(false);
  };

  const handleSave = async () => {
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid phone number (with country code)");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await savePhoneNumber(userId, cleaned);
      sessionStorage.setItem("phone-prompt-dismissed", "1");
      setVisible(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <Phone size={16} className="text-green-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              Get WhatsApp notifications
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2 ml-10">
          Add your number to get notified when someone @mentions you.
        </p>

        <div className="mt-3 ml-10 space-y-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            placeholder="919876543210"
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !phone.trim()}
              className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
