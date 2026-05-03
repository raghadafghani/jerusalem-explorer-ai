import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  MapPin, Wallet, Clock4, Calendar as CalendarIcon, BedDouble, Users, Sparkles,
  Wand2, Loader2, RotateCcw, ArrowDown, Compass, Brain, CloudSun, Globe2,
  ChevronRight, CheckCircle, ArrowRight, Zap, Shield, Star,
} from "lucide-react";
import { CityCompassLogo } from "@/components/CityCompassLogo";
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
import { type Lang, t, LANGS, LANG_STORAGE_KEY, isLang } from "@/lib/i18n";
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
  const currentYear = new Date().getFullYear();

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLang = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(storedLang)) {
      setLang(storedLang);
    }
  }, []);

  // sync html dir + lang
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", lang);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <CityCompassLogo size={28} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight">{t(lang, "brand")}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t(lang, "tagline")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/contact"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:inline-flex"
            >
              {t(lang, "nav_contact")}
            </Link>
            <LangSwitcher lang={lang} onChange={setLang} />
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden min-h-[88vh] flex flex-col justify-center">
        {/* Background layers */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(ellipse 60% 50% at 15% 50%, oklch(0.62 0.13 195 / 0.18) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 85% 30%, oklch(0.72 0.14 75 / 0.13) 0%, transparent 65%),
            radial-gradient(ellipse 40% 40% at 60% 80%, oklch(0.55 0.12 195 / 0.10) 0%, transparent 60%)
          `
        }} />

        {/* Decorative glowing orbs */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-96 w-96 rounded-full bg-primary/8 blur-[80px] animate-glow-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-gold/10 blur-[60px] animate-glow-pulse" style={{ animationDelay: "2s" }} />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/4 blur-[120px]" />

        {/* Floating destination pills */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block overflow-hidden">
          {[
            { label: "🕌 Jerusalem", cls: "top-[18%] left-[6%]", delay: "0s" },
            { label: "⛵ Sea of Galilee", cls: "top-[30%] right-[5%]", delay: "1.5s" },
            { label: "🏛️ Nazareth", cls: "bottom-[32%] left-[4%]", delay: "3s" },
            { label: "🌿 Golan Heights", cls: "top-[55%] right-[7%]", delay: "0.8s" },
            { label: "🐚 Haifa", cls: "bottom-[20%] right-[12%]", delay: "2.2s" },
            { label: "🏰 Akko", cls: "top-[12%] right-[18%]", delay: "1s" },
          ].map(({ label, cls, delay }) => (
            <div
              key={label}
              className={`absolute ${cls} animate-float`}
              style={{ animationDelay: delay, animationDuration: `${5 + Math.random() * 3}s` }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/70 px-3.5 py-1.5 text-xs font-semibold text-foreground/80 shadow-md backdrop-blur-md">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Hero content */}
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-16 pb-10 text-center">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm mb-6 backdrop-blur-sm" style={{ animationDelay: "0ms" }}>
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered · Weather-Smart · Multilingual
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] text-balance" style={{ animationDelay: "80ms" }}>
            Explore the{" "}
            <span className="text-gradient-primary">Holy Land</span>
            <br className="hidden sm:block" />
            {" "}Like Never Before
          </h1>

          {/* Subtext */}
          <p className="animate-fade-up mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto text-pretty" style={{ animationDelay: "160ms" }}>
            Tell us where you want to go. Our AI builds a personalized, day-by-day itinerary — weather-aware, budget-matched, and ready to navigate.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
            <a
              href="#planner"
              className="inline-flex items-center gap-2 rounded-full gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              Plan My Trip
              <ChevronRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-background hover:shadow-md"
            >
              How it works
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          {/* Trust row */}
          <div className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground" style={{ animationDelay: "320ms" }}>
            {[
              { icon: CheckCircle, text: "Real-time weather" },
              { icon: Globe2, text: "Arabic · Hebrew · English" },
              { icon: Zap, text: "Instant AI planning" },
              { icon: Shield, text: "Free to use" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5 font-medium">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative mx-auto flex flex-col items-center gap-1 pb-8 text-muted-foreground">
          <span className="text-[11px] font-medium uppercase tracking-widest">Scroll to plan</span>
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </div>
      </section>

      {/* ── PLANNER ── */}
      <section id="planner" className="relative bg-gradient-to-b from-background via-background to-secondary/20 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              {t(lang, "hero_eyebrow")}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{t(lang, "hero_title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{t(lang, "hero_sub")}</p>
          </div>

          {/* Planner grid */}
          <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
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

      {/* ── ITINERARY (after generation) ── */}
      {plan && (
        <section id="itinerary" className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
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
        </section>
      )}

      {/* ── LANDING SECTIONS (only when no plan) ── */}
      {!plan && <LandingSections lang={lang} onStartPlanning={() => document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" })} />}

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-border/60 bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
                <CityCompassLogo size={22} />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">{t(lang, "brand")}</div>
                <div className="text-[11px] text-muted-foreground">{t(lang, "tagline")}</div>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a>
              <a href="#destinations" className="hover:text-primary transition-colors">Destinations</a>
              <Link to="/contact" className="hover:text-primary transition-colors">{t(lang, "contact_title")}</Link>
            </div>

            {/* Copy */}
            <p className="text-xs text-muted-foreground">
              © {currentYear} City Compass · Powered by AI & Open-Meteo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────
   COUNT-UP COMPONENT
───────────────────────────────────────── */
function CountUp({ end, suffix = "", duration = 1800 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─────────────────────────────────────────
   LANDING SECTIONS
───────────────────────────────────────── */
const FEATURED_CITIES = [
  { name: "Jerusalem", emoji: "🕌", desc: "The Holy City — ancient walls, sacred sites, vibrant souks.", color: "from-amber-400/20 to-orange-300/10" },
  { name: "Nazareth", emoji: "🏛️", desc: "The city of Jesus — basilicas, aromatic markets, Arab cuisine.", color: "from-teal-400/20 to-cyan-300/10" },
  { name: "Haifa", emoji: "🌺", desc: "Mount Carmel, Bahá'í Gardens, and a stunning Mediterranean port.", color: "from-indigo-400/20 to-blue-300/10" },
  { name: "Tiberias", emoji: "⛵", desc: "Sea of Galilee shores, hot springs, and spiritual landscapes.", color: "from-sky-400/20 to-teal-300/10" },
  { name: "Akko", emoji: "🏰", desc: "Crusader city, ancient port, and legendary hummus joints.", color: "from-violet-400/20 to-purple-300/10" },
  { name: "Safed", emoji: "🎨", desc: "Mystical Kabbalah city, artist quarter, mountain cool air.", color: "from-rose-400/20 to-pink-300/10" },
];

const HOW_STEPS = [
  {
    n: "01",
    icon: MapPin,
    title: "Choose your destination",
    desc: "Pick any city in the Holy Land — Jerusalem, Nazareth, Haifa, Tiberias and more.",
    color: "text-primary",
    bg: "bg-primary/8",
  },
  {
    n: "02",
    icon: Brain,
    title: "AI crafts your plan",
    desc: "Our AI reads live weather, your budget, group size, and interests to build a perfect itinerary.",
    color: "text-gold-foreground",
    bg: "bg-gold/12",
  },
  {
    n: "03",
    icon: Compass,
    title: "Navigate & explore",
    desc: "One-tap Waze navigation to every stop. Your whole trip in your pocket.",
    color: "text-teal-600",
    bg: "bg-teal-500/10",
  },
];

const WHY_ITEMS = [
  { icon: CloudSun, title: "Live weather intelligence", desc: "Rainy day? AI swaps outdoor stops for museums, markets, and indoor gems automatically.", color: "text-sky-500", bg: "bg-sky-500/10" },
  { icon: Zap, title: "Instant AI planning", desc: "Full day-by-day itinerary generated in seconds — not hours of research.", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Globe2, title: "Truly multilingual", desc: "Full experience in English, Arabic (RTL), and Hebrew. Switch languages anytime.", color: "text-teal-500", bg: "bg-teal-500/10" },
  { icon: Wallet, title: "Smart budget matching", desc: "Set your total budget and group size. AI automatically targets the right tier.", color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: MapPin, title: "Optimized routing", desc: "Stops are grouped geographically to minimize driving time and maximize experience.", color: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: Star, title: "Curated local picks", desc: "Every spot is verified with real coordinates, honest cost estimates, and reservation notes.", color: "text-gold-foreground", bg: "bg-gold/12" },
];

function LandingSections({ lang, onStartPlanning }: { lang: Lang; onStartPlanning: () => void }) {
  return (
    <div>
      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 sm:py-24 bg-gradient-to-b from-secondary/30 to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-14 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary mb-4">
              Simple & Powerful
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">How it works</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Three steps from idea to full itinerary, in seconds.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {HOW_STEPS.map((step, i) => (
              <div
                key={step.n}
                className="relative rounded-3xl border border-border bg-surface p-7 shadow-elegant hover:shadow-xl transition-all hover:-translate-y-1 animate-fade-up group"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Step number watermark */}
                <span className="absolute top-4 right-5 text-6xl font-black text-foreground/5 select-none">{step.n}</span>
                <div className={cn("mb-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm", step.bg)}>
                  <step.icon className={cn("h-6 w-6", step.color)} />
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < HOW_STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/30 hidden sm:block" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center animate-fade-up" style={{ animationDelay: "300ms" }}>
            <button
              onClick={onStartPlanning}
              className="inline-flex items-center gap-2 rounded-full gradient-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              Start Planning Now
            </button>
          </div>
        </div>
      </section>

      {/* ── POPULAR DESTINATIONS ── */}
      <section id="destinations" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-14 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/8 px-3.5 py-1.5 text-xs font-semibold text-gold-foreground mb-4">
              🌍 Explore
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Popular destinations</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">From ancient holy cities to coastal gems — every place has a story.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_CITIES.map((city, i) => (
              <button
                key={city.name}
                onClick={onStartPlanning}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br p-6 text-start shadow-sm",
                  "transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 hover:border-primary/30 animate-fade-up",
                  city.color,
                )}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-4xl mb-3 transition-transform group-hover:scale-110">{city.emoji}</div>
                <h3 className="text-lg font-bold tracking-tight mb-1">{city.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{city.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Plan a trip <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CITY COMPASS ── */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-background to-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-14 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary mb-4">
              🤖 AI-Powered
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Why City Compass?</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">We do the research, routing, and local knowledge — you do the exploring.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_ITEMS.map((item, i) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-all hover:border-primary/20 animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl shadow-sm", item.bg)}>
                  <item.icon className={cn("h-5 w-5", item.color)} />
                </div>
                <h3 className="font-bold text-base mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS / TRUST BANNER ── */}
      <section className="py-16 border-y border-border bg-gradient-to-r from-primary/6 via-background to-gold/8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 text-center">
            {[
              { end: 15, suffix: "+", label: "Cities covered" },
              { end: 3,  suffix: "",  label: "Languages" },
              { end: null, static: "Live", label: "Weather data" },
              { end: null, static: "Free", label: "Always" },
            ].map((stat, i) => (
              <div key={stat.label} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="text-4xl sm:text-5xl font-black text-gradient-primary mb-1">
                  {stat.end != null
                    ? <CountUp end={stat.end} suffix={stat.suffix ?? ""} />
                    : stat.static}
                </div>
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 sm:py-24 text-center">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 animate-fade-up">
          <div className="text-5xl mb-6 animate-float-slow">🧭</div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Your next adventure{" "}
            <span className="text-gradient-primary">starts here</span>
          </h2>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            No planning stress. No hours of research. Just tell us where — and we'll handle the rest.
          </p>
          <button
            onClick={onStartPlanning}
            className="inline-flex items-center gap-2 rounded-full gradient-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <Sparkles className="h-5 w-5" />
            Plan My Trip Now
          </button>
        </div>
      </section>
    </div>
  );
}
