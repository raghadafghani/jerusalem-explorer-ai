import { Navigation2, Clock, DollarSign, AlertCircle, CheckCircle2, Building2, UtensilsCrossed, Coffee, Mountain, BedDouble, Users, Sparkles } from "lucide-react";
import type { GeneratedPlan, PlanStop } from "@/server/generate-plan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Lang, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<PlanStop["category"], typeof Building2> = {
  attraction: Building2,
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  activity: Mountain,
  accommodation: BedDouble,
  tour: Users,
};

function wazeUrl(lat: number, lng: number) {
  return `https://www.waze.com/ul?ll=${lat}%2C${lng}&navigate=yes&zoom=17`;
}

export function ItineraryView({
  plan,
  lang,
  onHoverStops,
}: {
  plan: GeneratedPlan;
  lang: Lang;
  onHoverStops?: (stops: { lat: number; lng: number; title: string; n: number }[]) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Overview */}
      <section className="rounded-3xl border border-border bg-gradient-card p-6 sm:p-8 shadow-elegant animate-fade-up">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="outline" className="mb-3 gap-1 border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="h-3 w-3" />
              {t(lang, "overview")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">
              {plan.destination}
            </h2>
          </div>
        </div>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed text-pretty max-w-3xl">
          {plan.overview}
        </p>

        {plan.smartInsights.length > 0 && (
          <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-foreground">
              <Sparkles className="h-4 w-4 text-gold" />
              {t(lang, "smart_insights")}
            </div>
            <ul className="space-y-2">
              {plan.smartInsights.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Days */}
      <div className="space-y-6">
        {plan.days.map((day, idx) => {
          const stopMarkers = day.stops.map((s, i) => ({ lat: s.lat, lng: s.lng, title: s.title, n: i + 1 }));
          return (
            <section
              key={day.dayNumber}
              onMouseEnter={() => onHoverStops?.(stopMarkers)}
              className="rounded-3xl border border-border bg-surface overflow-hidden shadow-elegant animate-fade-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <header className="bg-gradient-to-r from-primary/8 to-transparent border-b border-border px-6 py-5">
                <div className="flex items-baseline gap-3">
                  <span className="rounded-lg gradient-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    {t(lang, "day")} {day.dayNumber}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight">{day.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{day.summary}</p>
              </header>

              <ol className="divide-y divide-border">
                {day.stops.map((stop, i) => {
                  const Icon = CATEGORY_ICON[stop.category] ?? Building2;
                  return (
                    <li key={i} className="grid grid-cols-[auto_1fr] gap-4 sm:gap-6 px-6 py-5 hover:bg-secondary/40 transition-colors group">
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold font-bold text-gold-foreground shadow-gold-glow">
                          {i + 1}
                        </div>
                        <div className="text-[11px] font-mono font-medium text-muted-foreground">{stop.time}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                            <h4 className="font-semibold text-base leading-tight">{stop.title}</h4>
                          </div>
                          {stop.reservation !== "none" && (
                            <Badge
                              className={cn(
                                "gap-1 rounded-full text-[11px] font-medium",
                                stop.reservation === "required"
                                  ? "bg-destructive/10 text-destructive hover:bg-destructive/15 border-destructive/20"
                                  : "bg-gold/15 text-gold-foreground hover:bg-gold/20 border-gold/30"
                              )}
                              variant="outline"
                            >
                              {stop.reservation === "required" ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {t(lang, stop.reservation === "required" ? "reservation_required" : "reservation_recommended")}
                            </Badge>
                          )}
                        </div>

                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed text-pretty">
                          {stop.description}
                        </p>

                        <div className="mt-3 flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {stop.durationMinutes} min</span>
                          {stop.estimatedCostUsd > 0 && (
                            <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" /> ~${stop.estimatedCostUsd}</span>
                          )}
                          {stop.address && <span className="truncate max-w-[240px]">{stop.address}</span>}
                        </div>

                        <div className="mt-4">
                          <Button asChild size="sm" variant="outline" className="rounded-full gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
                            <a href={wazeUrl(stop.lat, stop.lng)} target="_blank" rel="noopener noreferrer">
                              <Navigation2 className="h-3.5 w-3.5" />
                              {t(lang, "navigate")}
                            </a>
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      {/* Accommodations */}
      {plan.accommodations.length > 0 && (
        <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-elegant animate-fade-up">
          <h3 className="text-xl font-bold tracking-tight mb-5 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary" />
            {t(lang, "accommodation_picks")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plan.accommodations.map((a, i) => (
              <div key={i} className="rounded-2xl border border-border bg-gradient-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold leading-tight">{a.name}</h4>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{a.category}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">{a.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">${a.pricePerNightUsd}<span className="text-xs font-normal text-muted-foreground"> / night</span></span>
                  <Button asChild size="sm" variant="ghost" className="rounded-full text-primary gap-1 h-8">
                    <a href={wazeUrl(a.lat, a.lng)} target="_blank" rel="noopener noreferrer">
                      <Navigation2 className="h-3.5 w-3.5" />
                      {t(lang, "navigate")}
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Group tours */}
      {plan.groupTours.length > 0 && (
        <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-elegant animate-fade-up">
          <h3 className="text-xl font-bold tracking-tight mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t(lang, "group_tours")}
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {plan.groupTours.map((tour, i) => (
              <div key={i} className="rounded-2xl border border-border bg-gradient-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="font-semibold leading-tight">{tour.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{tour.operator}</p>
                  </div>
                  <span className="text-base font-bold text-primary">${tour.pricePerPersonUsd}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">{tour.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-muted-foreground">{t(lang, "schedule")}</span>
                  <span className="font-medium">{tour.schedule}</span>
                  <span className="text-muted-foreground">{t(lang, "duration")}</span>
                  <span className="font-medium">{tour.durationHours}h</span>
                  <span className="text-muted-foreground">{t(lang, "languages")}</span>
                  <span className="font-medium">{tour.languages.join(", ")}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 rounded-full gap-1.5">
                    <a href={wazeUrl(tour.lat, tour.lng)} target="_blank" rel="noopener noreferrer">
                      <Navigation2 className="h-3.5 w-3.5" />
                      {t(lang, "navigate")}
                    </a>
                  </Button>
                  <Button size="sm" className="flex-1 rounded-full gradient-primary text-primary-foreground">
                    {t(lang, "book_tour")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
