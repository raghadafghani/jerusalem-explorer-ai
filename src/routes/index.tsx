import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  MapPin, Wallet, Clock4, Calendar as CalendarIcon, BedDouble, Users, Sparkles,
  Wand2, Loader2, Compass, RotateCcw, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/utils";

import { LangSwitcher } from "@/components/LangSwitcher";
import { Chip } from "@/components/Chip";
import { PlannerMap, type MapStop } from "@/components/PlannerMap";
import { WeatherBadge } from "@/components/WeatherBadge";
import { ItineraryView } from "@/components/ItineraryView";
import { type Lang, t, LANGS } from "@/lib/i18n";
import { DESTINATIONS, findDestination } from "@/lib/destinations";
import type { GeneratedPlan } from "@/server/generate-plan";

export const Route = createFileRoute("/")({
  component: Index,
});

const DEFAULT_CENTER: [number, number] = [31.7683, 35.2137]; // Jerusalem
const CURRENCIES = ["USD", "ILS", "EUR", "JOD"] as const;
type CurrencyCode = typeof CURRENCIES[number];

const CURRENCY_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  ILS: 0.27,
  EUR: 1.08,
  JOD: 1.41,
};

function inferBudgetTier(amount: number, currency: CurrencyCode, people: number, days: number) {
  const perPersonPerDayUsd = (amount * CURRENCY_TO_USD[currency]) / Math.max(1, people) / Math.max(1, days);
  if (perPersonPerDayUsd < 80) return "low" as const;
  if (perPersonPerDayUsd > 220) return "luxury" as const;
  return "medium" as const;
}

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const dir = LANGS.find((l) => l.code === lang)!.dir;

  const [destination, setDestination] = useState("");
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(11);
  const [markerLabel, setMarkerLabel] = useState<string>("Jerusalem");
  const [hoverStops, setHoverStops] = useState<MapStop[]>([]);

  const [budgetAmount, setBudgetAmount] = useState("300");
  const [budgetCurrency, setBudgetCurrency] = useState<CurrencyCode>("USD");
  const [duration, setDuration] = useState<"half" | "full" | "multi">("full");
  const [date, setDate] = useState<Date>(() => new Date());
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const from = new Date();
    return { from, to: addDays(from, 2) };
  });
  const [accommodation, setAccommodation] = useState(false);
  const [people, setPeople] = useState(2);
  const [ages, setAges] = useState("");
  const [interests, setInterests] = useState("");
  const [planType, setPlanType] = useState<"custom" | "group">("custom");

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);

  // sync html dir + lang
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", lang);
    }
  }, [dir, lang]);

  // Auto-locate map when typing a known city
  useEffect(() => {
    if (!destination) return;
    const d = findDestination(destination);
    if (d) {
      setCenter([d.lat, d.lng]);
      setMarkerLabel(d.names[lang]);
      setZoom(13);
    }
  }, [destination, lang]);

  const knownDest = useMemo(() => findDestination(destination), [destination]);
  const tripStartDate = duration === "multi" ? (dateRange.from ?? date) : date;
  const tripEndDate = duration === "multi" ? (dateRange.to ?? dateRange.from ?? date) : date;
  const tripDays = duration === "multi"
    ? Math.max(1, Math.floor((tripEndDate.getTime() - tripStartDate.getTime()) / 86_400_000) + 1)
    : 1;
  const parsedBudgetAmount = Math.max(0, Number(budgetAmount) || 0);
  const budget = inferBudgetTier(parsedBudgetAmount || 300, budgetCurrency, people, tripDays);
  const dateLabel = duration === "multi"
    ? `${format(tripStartDate, "MMM d, yyyy")} - ${format(tripEndDate, "MMM d, yyyy")}`
    : format(date, "PPP");

  async function handleGenerate() {
    const dest = knownDest;
    const finalLat = dest?.lat ?? center[0];
    const finalLng = dest?.lng ?? center[1];
    const destName = dest ? dest.names[lang] : destination.trim();

    if (!destName) {
      toast.error(t(lang, "where_label"));
      return;
    }
    if (parsedBudgetAmount <= 0) {
      toast.error("Enter your budget amount");
      return;
    }

    setLoading(true);
    setPlan(null);
    setHoverStops([]);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destName,
          lat: finalLat,
          lng: finalLng,
          budget,
          budgetAmount: parsedBudgetAmount,
          budgetCurrency,
          duration,
          date: format(tripStartDate, "yyyy-MM-dd"),
          endDate: duration === "multi" ? format(tripEndDate, "yyyy-MM-dd") : undefined,
          accommodation,
          people,
          ages,
          interests,
          planType,
          language: lang,
        }),
      });

      const result = (await res.json()) as GeneratedPlan | { error?: string };
      if (!res.ok || "error" in result) throw new Error(result.error ?? "AI_ERROR");

      setPlan(result);
      toast.success(t(lang, "plan_ready"));
      setTimeout(() => {
        document.getElementById("itinerary")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("RATE_LIMIT")) toast.error(t(lang, "error_rate"));
      else if (msg.includes("CREDITS_REQUIRED")) toast.error(t(lang, "error_credits"));
      else toast.error(t(lang, "error_generic"));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPlan(null);
    setHoverStops([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const mapStops = hoverStops.length > 0
    ? hoverStops
    : (plan?.days.flatMap((day) => day.stops) ?? []).map((s, i) => ({ lat: s.lat, lng: s.lng, title: s.title, n: i + 1 }));

  return (
    <div className="min-h-screen">
      <Toaster richColors position={dir === "rtl" ? "top-left" : "top-right"} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-glow">
              <Compass className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight">{t(lang, "brand")}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t(lang, "tagline")}</span>
            </div>
          </div>
          <LangSwitcher lang={lang} onChange={setLang} />
        </div>
      </header>

      {/* Hero + planner */}
      <section className="gradient-hero relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 sm:pt-20 pb-12">
          <div className="text-center max-w-3xl mx-auto animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              {t(lang, "hero_eyebrow")}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
              {t(lang, "hero_title")}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed text-pretty max-w-2xl mx-auto">
              {t(lang, "hero_sub")}
            </p>
          </div>

          {/* Planner */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
            {/* Form card */}
            <div className="rounded-3xl border border-border bg-surface/95 backdrop-blur p-6 sm:p-8 shadow-elegant animate-fade-up" style={{ animationDelay: "120ms" }}>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                {t(lang, "where_label")}
              </Label>
              <div className="relative">
                <MapPin className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none", dir === "rtl" ? "right-4" : "left-4")} />
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t(lang, "where_placeholder")}
                  className={cn("h-14 text-base font-medium rounded-2xl border-2 focus-visible:border-primary focus-visible:ring-primary/20", dir === "rtl" ? "pr-12 pl-4" : "pl-12 pr-4")}
                  list="destination-suggestions"
                />
                <datalist id="destination-suggestions">
                  {DESTINATIONS.map((d) => (
                    <option key={d.id} value={d.names[lang]} />
                  ))}
                </datalist>
              </div>

              <div className="mt-6 space-y-5">
                {/* Budget */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" /> {t(lang, "budget")}
                  </Label>
                  <div className="grid grid-cols-[1fr_112px] gap-3">
                    <div className="relative">
                      <Wallet className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none", dir === "rtl" ? "right-3" : "left-3")} />
                      <Input
                        type="number"
                        min={1}
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        placeholder="300"
                        className={cn("h-11 rounded-xl font-semibold", dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3")}
                      />
                    </div>
                    <Select value={budgetCurrency} onValueChange={(value) => setBudgetCurrency(value as CurrencyCode)}>
                      <SelectTrigger className="h-11 rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Planning as {t(lang, `budget_${budget}`)} based on {people} traveler{people === 1 ? "" : "s"} and {tripDays} day{tripDays === 1 ? "" : "s"}.
                  </p>
                </div>

                {/* Time */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Clock4 className="h-3.5 w-3.5" /> {t(lang, "time")}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(["half", "full", "multi"] as const).map((d) => (
                      <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>
                        {t(lang, `time_${d}`)}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Date + accommodation row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5" /> {t(lang, "dates")}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-medium h-11 rounded-xl">
                          <CalendarIcon className="h-4 w-4 me-2" />
                          <span className="truncate">{dateLabel}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        {duration === "multi" ? (
                          <Calendar
                            mode="range"
                            numberOfMonths={2}
                            selected={dateRange}
                            onSelect={(range) => {
                              const from = range?.from ?? dateRange.from ?? new Date();
                              const to = range?.to ?? range?.from ?? dateRange.to ?? addDays(from, 2);
                              setDateRange({ from, to });
                            }}
                            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        ) : (
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => d && setDate(d)}
                            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5" /> {t(lang, "accommodation")}
                    </Label>
                    <div className="flex h-11 items-center justify-between rounded-xl border border-input bg-surface px-4">
                      <span className="text-sm font-medium text-muted-foreground">{accommodation ? "✓" : "—"}</span>
                      <Switch checked={accommodation} onCheckedChange={setAccommodation} />
                    </div>
                  </div>
                </div>

                {/* People + ages */}
                <div className="grid sm:grid-cols-[180px_1fr] gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5 whitespace-nowrap">
                      <Users className="h-3.5 w-3.5" /> {t(lang, "people")}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={people}
                      onChange={(e) => setPeople(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                      className="h-11 rounded-xl text-center font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t(lang, "ages")}</Label>
                    <Input
                      value={ages}
                      onChange={(e) => setAges(e.target.value)}
                      placeholder={t(lang, "ages_placeholder")}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t(lang, "interests")}</Label>
                  <Input
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder={t(lang, "interests_placeholder")}
                    className="h-11 rounded-xl"
                  />
                </div>

                {/* Plan type */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t(lang, "plan_type")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { v: "custom" as const, icon: Wand2 },
                      { v: "group" as const, icon: Users },
                    ]).map(({ v, icon: Icon }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPlanType(v)}
                        className={cn(
                          "rounded-2xl border-2 p-4 text-start transition-all group",
                          planType === v
                            ? "border-primary bg-primary/5 shadow-glow"
                            : "border-border hover:border-primary/40 bg-surface"
                        )}
                      >
                        <Icon className={cn("h-5 w-5 mb-2 transition-colors", planType === v ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                        <div className="font-semibold text-sm leading-tight">{t(lang, `plan_${v}`)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{t(lang, `plan_${v}_desc`)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading}
                size="lg"
                className="mt-7 w-full h-14 rounded-2xl text-base font-semibold gradient-primary text-primary-foreground shadow-glow hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t(lang, "generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {t(lang, "generate")}
                  </>
                )}
              </Button>
            </div>

            {/* Map */}
            <div className="rounded-3xl border border-border bg-surface overflow-hidden shadow-elegant animate-fade-up min-h-[500px] lg:min-h-0 lg:h-auto flex flex-col" style={{ animationDelay: "200ms" }}>
              <div className="flex-1 min-h-[420px] relative">
                <PlannerMap center={center} zoom={zoom} markerLabel={markerLabel} stops={mapStops} />
              </div>
              <div className="border-t border-border p-4 bg-gradient-to-b from-background/60 to-background/95 backdrop-blur">
                {plan ? (
                  <WeatherBadge weather={plan.weather} />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
                    <span>{t(lang, "powered")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Itinerary */}
      <section id="itinerary" className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        {plan ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 pt-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">{t(lang, "your_itinerary")}</div>
                <h2 className="text-3xl font-bold tracking-tight">{plan.destination}</h2>
              </div>
              <Button variant="outline" onClick={reset} className="rounded-full gap-1.5">
                <RotateCcw className="h-4 w-4" />
                {t(lang, "new_plan")}
              </Button>
            </div>
            <ItineraryView plan={plan} lang={lang} onHoverStops={setHoverStops} />
          </div>
        ) : (
          <FeatureStrip lang={lang} />
        )}
      </section>

      <footer className="border-t border-border/60 bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground">
          {t(lang, "powered")}
        </div>
      </footer>
    </div>
  );
}

function FeatureStrip({ lang }: { lang: Lang }) {
  const items = [
    { key: "1", icon: "☁️" },
    { key: "2", icon: "🧭" },
    { key: "3", icon: "🏛️" },
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-3 mt-8">
      {items.map((it, i) => (
        <div
          key={it.key}
          className="rounded-3xl border border-border bg-gradient-card p-6 shadow-sm hover:shadow-md transition-all animate-fade-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="text-3xl mb-3">{it.icon}</div>
          <h3 className="font-bold text-lg leading-tight">{t(lang, `feature_${it.key}_title`)}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(lang, `feature_${it.key}_desc`)}</p>
        </div>
      ))}
    </div>
  );
}
