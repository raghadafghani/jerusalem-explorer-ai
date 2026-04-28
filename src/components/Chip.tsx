import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
}

export function Chip({ active, onClick, children, icon }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 border",
        "hover:-translate-y-0.5",
        active
          ? "bg-foreground text-background border-foreground shadow-md"
          : "bg-surface text-foreground border-border hover:border-foreground/40 hover:bg-secondary",
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
