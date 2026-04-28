import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, Wind, Droplets, Thermometer } from "lucide-react";
import type { WeatherSnapshot } from "@/server/generate-plan";
import { cn } from "@/lib/utils";

function iconFor(code: number) {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 51) return CloudRain;
  return Cloud;
}

export function WeatherBadge({ weather, className }: { weather: WeatherSnapshot; className?: string }) {
  const Icon = iconFor(weather.code);
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-border bg-gradient-card px-4 py-3 shadow-sm", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-glow">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex flex-col leading-tight">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">{weather.tempC}°</span>
          <span className="text-xs text-muted-foreground">C</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{weather.summary}</span>
      </div>
      <div className="ms-auto hidden flex-col gap-1 text-xs text-muted-foreground sm:flex">
        <span className="inline-flex items-center gap-1"><Droplets className="h-3 w-3" /> {weather.precipitationMm}mm</span>
        <span className="inline-flex items-center gap-1"><Wind className="h-3 w-3" /> {weather.windKph}km/h</span>
        <span className="inline-flex items-center gap-1"><Thermometer className="h-3 w-3" /> {weather.feelsLikeC}°</span>
      </div>
    </div>
  );
}
