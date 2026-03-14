import {
  Film,
  PenLine,
  Palette,
  Cpu,
  Camera,
  Music,
  Mic,
  Video,
  Brush,
  Scissors,
  Code,
  BookOpen,
  Image,
  Sparkles,
  Megaphone,
  PenTool,
  Monitor,
  Clapperboard,
  Pencil,
  Briefcase,
  type LucideProps,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Film,
  PenLine,
  Palette,
  Cpu,
  Camera,
  Music,
  Mic,
  Video,
  Brush,
  Scissors,
  Code,
  BookOpen,
  Image,
  Sparkles,
  Megaphone,
  PenTool,
  Monitor,
  Clapperboard,
  Pencil,
  Briefcase,
};

interface DynamicIconProps extends LucideProps {
  name: string;
}

/**
 * Renders either an emoji (if name is an emoji character) or a Lucide icon.
 * Supports both legacy Lucide icon names and new emoji-based icons.
 */
export function DynamicIcon({ name, size = 18, className, ...props }: DynamicIconProps) {
  // Check if name is an emoji (starts with a non-ASCII character or is a known emoji)
  const isEmoji = /^\p{Emoji}/u.test(name) && !ICON_MAP[name];

  if (isEmoji) {
    const fontSize = typeof size === "number" ? size : 18;
    return (
      <span
        role="img"
        aria-label="role icon"
        className={className}
        style={{ fontSize: fontSize, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        {name}
      </span>
    );
  }

  const IconComponent = ICON_MAP[name] ?? Briefcase;
  return <IconComponent size={size} className={className} {...props} />;
}
