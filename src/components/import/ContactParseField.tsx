"use client";

import { useState } from "react";
import { Mail, Phone, AtSign, Link as LinkIcon } from "lucide-react";
import { parseContacts } from "@/lib/ai/textParser";
import type { ParsedContacts } from "@/lib/ai/textParser";

// ---------------------------------------------------------------------------
// ContactParseField
// ---------------------------------------------------------------------------

export interface ContactParseFieldProps {
  onParsed: (parsed: ParsedContacts) => void;
}

export function ContactParseField({ onParsed }: ContactParseFieldProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedContacts | null>(null);

  const handleChange = (value: string) => {
    setText(value);
    if (value.trim()) {
      const result = parseContacts(value);
      setParsed(result);
    } else {
      setParsed(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    const result = parseContacts(pasted);
    setParsed(result);
  };

  const hasDetected =
    parsed &&
    (parsed.emails.length > 0 ||
      parsed.phones.length > 0 ||
      parsed.instagrams.length > 0 ||
      parsed.urls.length > 0);

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={handlePaste}
        placeholder="Paste contact info — emails, phone numbers, Instagram handles, URLs will be auto-detected"
        rows={4}
        className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
      />

      {/* Detection preview */}
      {parsed && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
          {parsed.emails.length > 0 && (
            <div className="space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <Mail size={12} />
                Email{parsed.emails.length > 1 ? "s" : ""} found
              </p>
              <ul className="ml-4 space-y-0.5">
                {parsed.emails.map((email, i) => (
                  <li key={i} className="text-xs text-gray-700 font-mono">
                    {email}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.phones.length > 0 && (
            <div className="space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <Phone size={12} />
                Phone{parsed.phones.length > 1 ? "s" : ""} found
              </p>
              <ul className="ml-4 space-y-0.5">
                {parsed.phones.map((phone, i) => (
                  <li key={i} className="text-xs text-gray-700 font-mono">
                    {phone}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.instagrams.length > 0 && (
            <div className="space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <AtSign size={12} />
                Instagram handle{parsed.instagrams.length > 1 ? "s" : ""} found
              </p>
              <ul className="ml-4 space-y-0.5">
                {parsed.instagrams.map((handle, i) => (
                  <li key={i} className="text-xs text-gray-700 font-mono">
                    @{handle}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.urls.length > 0 && (
            <div className="space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <LinkIcon size={12} />
                URL{parsed.urls.length > 1 ? "s" : ""} found
              </p>
              <ul className="ml-4 space-y-0.5">
                {parsed.urls.slice(0, 5).map((url, i) => (
                  <li key={i} className="text-xs text-gray-700 font-mono truncate max-w-xs">
                    {url}
                  </li>
                ))}
                {parsed.urls.length > 5 && (
                  <li className="text-xs text-gray-500">
                    +{parsed.urls.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {!hasDetected && (
            <p className="text-xs text-gray-500">
              No contact info detected yet — try pasting more text.
            </p>
          )}
        </div>
      )}

      {/* Apply button */}
      {hasDetected && (
        <div className="flex justify-end">
          <button
            onClick={() => parsed && onParsed(parsed)}
            className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
          >
            Apply to fields
          </button>
        </div>
      )}
    </div>
  );
}
