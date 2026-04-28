import { Languages } from "lucide-react";
import { LANGS, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Props {
  lang: Lang;
  onChange: (l: Lang) => void;
}

export function LangSwitcher({ lang, onChange }: Props) {
  const current = LANGS.find((l) => l.code === lang)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full border-border/60 bg-surface/80 backdrop-blur">
          <Languages className="h-4 w-4" />
          <span className="font-medium">{current.native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => onChange(l.code)}
            className={l.code === lang ? "bg-accent/60 font-semibold" : ""}
          >
            <span className="flex w-full items-center justify-between">
              <span>{l.native}</span>
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
