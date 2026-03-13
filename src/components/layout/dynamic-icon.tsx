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

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const IconComponent = ICON_MAP[name] ?? Briefcase;
  return <IconComponent {...props} />;
}
