"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink } from "lucide-react";

const DEFAULT_COMPANY_NAME = "KnowAI";
const DEFAULT_TEAM_NAME = "the hiring team";

interface WhatsAppMessageModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly candidateName: string;
  readonly phone: string;
  readonly roleName: string | null;
}

/**
 * Normalize a phone number to international format for wa.me API.
 * Auto-prepends Indian country code (91) for 10-digit numbers.
 * Examples: "9876543210" -> "919876543210", "+91 98765-43210" -> "919876543210"
 */
function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const stripped = digits.startsWith("0") ? digits.slice(1) : digits;
  if (stripped.length === 10) return "91" + stripped;
  return stripped;
}

/** Convert "JOHN DOE" or "john doe" → "John Doe" */
function toTitleCase(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDefaultMessage(
  candidateName: string,
  roleName: string | null,
): string {
  const role = roleName ?? "open";
  const firstName = toTitleCase(candidateName.split(/\s+/)[0]);
  return [
    `Hi ${firstName}!`,
    "",
    `This is ${DEFAULT_TEAM_NAME} from ${DEFAULT_COMPANY_NAME}. We noticed you applied for the ${role} position.`,
    "",
    "We've reviewed your profile and would love to discuss this further. When would be a good time to chat?",
    "",
    "Looking forward to hearing from you!",
  ].join("\n");
}

export function WhatsAppMessageModal({
  open,
  onClose,
  candidateName,
  phone,
  roleName,
}: WhatsAppMessageModalProps) {
  const defaultMessage = useMemo(
    () => buildDefaultMessage(candidateName, roleName),
    [candidateName, roleName],
  );

  const [message, setMessage] = useState(defaultMessage);

  // Reset message when modal opens with new data
  const [prevKey, setPrevKey] = useState(`${candidateName}-${phone}`);
  const currentKey = `${candidateName}-${phone}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setMessage(buildDefaultMessage(candidateName, roleName));
  }

  const cleanedPhone = cleanPhoneNumber(phone);

  const whatsappUrl = useMemo(() => {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanedPhone}?text=${encoded}`;
  }, [cleanedPhone, message]);

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send WhatsApp Message</DialogTitle>
          <DialogDescription>
            Message for{" "}
            <span className="font-medium text-foreground">{candidateName}</span>
            {roleName && (
              <>
                {" "}
                &mdash; <span className="text-foreground">{roleName}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Phone display */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{phone}</span>
          <span className="text-xs text-gray-400">(wa.me/{cleanedPhone})</span>
        </div>

        {/* Editable message */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          className="resize-y text-sm"
          placeholder="Type your message..."
        />

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            onClick={handleOpenWhatsApp}
            disabled={!message.trim()}
            className="bg-[#25D366] text-white hover:bg-[#128C7E] border-transparent"
          >
            <ExternalLink className="h-4 w-4" />
            Open in WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
