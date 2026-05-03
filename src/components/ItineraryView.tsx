import { useEffect, useState } from "react";
import { Navigation2, Clock, DollarSign, AlertCircle, CheckCircle2, Building2, UtensilsCrossed, Coffee, Mountain, BedDouble, Users, Sparkles, Star, MapPinned, CloudSun, Route, ShieldCheck, CalendarDays, Image as ImageIcon, Car, Fuel, Sunrise, Sun, Moon, Snowflake, CloudRain, Wind, Umbrella, Thermometer, CloudSnow, Flame, Droplets } from "lucide-react";
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

const CURRENCY_META = {
  USD: { symbol: "$", rate: 1 },
  ILS: { symbol: "₪", rate: 3.7 },
  EUR: { symbol: "€", rate: 0.93 },
  JOD: { symbol: "د.أ", rate: 0.71 },
} satisfies Record<GeneratedPlan["budgetCurrency"], { symbol: string; rate: number }>;

function formatMoney(usd: number, currency: GeneratedPlan["budgetCurrency"]) {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const value = usd * meta.rate;
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return currency === "JOD" ? `${rounded} ${meta.symbol}` : `${meta.symbol}${rounded}`;
}

function wazeUrl(lat: number, lng: number) {
  return `https://www.waze.com/ul?ll=${lat}%2C${lng}&navigate=yes&zoom=17`;
}

const PLACE_IMAGES = [
  {
    patterns: ["jaffa gate"],
    wikiTitle: "Jaffa_Gate",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Jaffa_Gate-Jerusalem.jpg?width=640",
  },
  {
    patterns: ["holy sepulchre", "sepulchre"],
    wikiTitle: "Church_of_the_Holy_Sepulchre",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Church_of_the_Holy_Sepulchre-Jerusalem.JPG?width=640",
  },
  {
    patterns: ["western wall", "wailing wall"],
    wikiTitle: "Western_Wall",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Western_Wall%2C_Jerusalem%2C.jpg?width=640",
  },
  {
    patterns: ["old city lunch", "old city market", "market lanes"],
    wikiTitle: "Muslim_Quarter",
  },
  {
    patterns: ["mount of olives", "olives viewpoint"],
    wikiTitle: "Mount_of_Olives",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Jerusalem_Mount_of_Olives.JPG?width=640",
  },
  {
    patterns: ["tower of david"],
    wikiTitle: "Tower_of_David",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Tower_of_David_Museum_by_David_Shankbone.jpg?width=640",
  },
  { patterns: ["israel museum"], wikiTitle: "Israel_Museum" },
  { patterns: ["mahane yehuda"], wikiTitle: "Mahane_Yehuda_Market" },
  { patterns: ["knesset"], wikiTitle: "Knesset" },
  { patterns: ["city of david"], wikiTitle: "City_of_David" },
  { patterns: ["ein kerem", "ein karem"], wikiTitle: "Ein_Karem" },
  { patterns: ["old city of acre", "akko old center", "acre walk"], wikiTitle: "Old_City_of_Acre" },
  { patterns: ["knights' halls", "knights halls", "acre citadel"], wikiTitle: "Hospitaller_fortress" },
  { patterns: ["khan al-umdan", "akko market", "acre market"], wikiTitle: "Khan_al-Umdan" },
  { patterns: ["acre port", "akko port", "sea walls", "waterfront"], wikiTitle: "Acre,_Israel" },
  { patterns: ["jazzar mosque", "white mosque of acre"], wikiTitle: "El-Jazzar_Mosque" },
  { patterns: ["bahá", "bahai", "baháʼí", "world centre", "gardens haifa"], wikiTitle: "Baháʼí_World_Centre" },
  { patterns: ["german colony"], wikiTitle: "German_Colony,_Haifa" },
  { patterns: ["wadi nisnas"], wikiTitle: "Wadi_Nisnas" },
  { patterns: ["stella maris", "mount carmel"], wikiTitle: "Stella_Maris_Monastery" },
];

function matchedPlaceImage(stop: PlanStop) {
  const text = `${stop.title} ${stop.imageQuery ?? ""}`.toLowerCase();
  return PLACE_IMAGES.find((image) => image.patterns.some((pattern) => text.includes(pattern)));
}

function wikiTitleForStop(stop: PlanStop) {
  return stop.wikiTitle ?? matchedPlaceImage(stop)?.wikiTitle;
}

function curatedImageUrl(stop: PlanStop) {
  return stop.imageUrl ?? matchedPlaceImage(stop)?.url;
}

function wikiSummaryUrl(wikiTitle: string) {
  return `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
}

function imageLock(value: string) {
  return Math.abs(
    value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 7)
  );
}

function imageKeywords(stop: PlanStop, destination: string) {
  const source = stop.imageQuery || `${stop.title} ${destination} travel landmark`;
  const words = source
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["and", "the", "near", "with"].includes(word.toLowerCase()))
    .slice(0, 4);

  const terms = words.length > 0 ? words : [destination, "travel"];
  return terms.map(encodeURIComponent).join(",");
}

function imageUrlForStop(stop: PlanStop, destination: string) {
  const curated = curatedImageUrl(stop);
  if (curated) return curated;

  const keywords = imageKeywords(stop, destination);
  return `https://loremflickr.com/480/360/${keywords}?lock=${imageLock(`${stop.title}-${destination}`)}`;
}

function fallbackImageUrl(destination: string) {
  return `https://loremflickr.com/480/360/${encodeURIComponent(destination)},travel,landmark?lock=${imageLock(destination)}`;
}

function PlaceImage({ stop, destination }: { stop: PlanStop; destination: string }) {
  const [src, setSrc] = useState(() => curatedImageUrl(stop) ?? "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const curated = curatedImageUrl(stop);
    setFailed(false);

    async function loadWikipediaThumbnail() {
      const wikiTitle = wikiTitleForStop(stop);
      if (!wikiTitle) {
        setSrc(curated ?? imageUrlForStop(stop, destination));
        return;
      }

      try {
        const res = await fetch(wikiSummaryUrl(wikiTitle));
        if (!res.ok) throw new Error("thumbnail unavailable");
        const json = (await res.json()) as { thumbnail?: { source?: string }, originalimage?: { source?: string } };
        const image = json.thumbnail?.source ?? json.originalimage?.source;
        if (!cancelled) setSrc(image ?? curated ?? imageUrlForStop(stop, destination));
      } catch {
        if (!cancelled) setSrc(curated ?? imageUrlForStop(stop, destination));
      }
    }

    loadWikipediaThumbnail();
    return () => {
      cancelled = true;
    };
  }, [destination, stop]);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary text-muted-foreground">
        <ImageIcon className="h-7 w-7" />
        <span className="px-4 text-center text-xs font-medium">{stop.title}</span>
      </div>
    );
  }

  return (
    <img
      src={src || imageUrlForStop(stop, destination)}
      alt={stop.title}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      onError={(event) => {
        const fallback = fallbackImageUrl(destination);
        if (event.currentTarget.src === fallback) {
          setFailed(true);
          return;
        }
        event.currentTarget.src = fallback;
      }}
    />
  );
}

function totalStops(plan: GeneratedPlan) {
  return plan.days.reduce((count, day) => count + day.stops.length, 0);
}

function totalMinutes(plan: GeneratedPlan) {
  return plan.days.reduce(
    (count, day) => count + day.stops.reduce((dayCount, stop) => dayCount + stop.durationMinutes, 0),
    0
  );
}

function totalCost(plan: GeneratedPlan) {
  return plan.days.reduce(
    (count, day) => count + day.stops.reduce((dayCount, stop) => dayCount + stop.estimatedCostUsd, 0),
    0
  );
}

function allStops(plan: GeneratedPlan) {
  return plan.days.flatMap((day) => day.stops);
}

function distanceKmBetween(a: PlanStop, b: PlanStop) {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

const CITY_ROAD_DISTANCE_FACTOR = 1.45;
const CITY_DRIVE_SPEED_KPH = 24;
const TRANSFER_BUFFER_MINUTES = 5;
const FUEL_LITERS_PER_100_KM = 8;
const CITY_FUEL_BUFFER = 1.2;

function routeLegs(plan: GeneratedPlan) {
  return plan.days.flatMap((day) =>
    day.stops.slice(1).map((stop, index) => ({
      from: day.stops[index],
      to: stop,
    }))
  );
}

function drivingSummary(plan: GeneratedPlan) {
  const legs = routeLegs(plan);
  const roadKm = legs.reduce(
    (sum, leg) => sum + distanceKmBetween(leg.from, leg.to) * CITY_ROAD_DISTANCE_FACTOR,
    0
  );
  const distanceKm = Math.max(0, Math.round(roadKm * 10) / 10);
  const driveMinutes =
    legs.length === 0
      ? 0
      : Math.round((roadKm / CITY_DRIVE_SPEED_KPH) * 60 + legs.length * TRANSFER_BUFFER_MINUTES);
  const fuelLiters = Math.round((distanceKm / 100) * FUEL_LITERS_PER_100_KM * CITY_FUEL_BUFFER * 10) / 10;

  return { distanceKm, driveMinutes, fuelLiters };
}

function driveLegEstimate(from: PlanStop, to: PlanStop) {
  const distanceKm = Math.round(distanceKmBetween(from, to) * CITY_ROAD_DISTANCE_FACTOR * 10) / 10;
  const minutes = Math.max(3, Math.round((distanceKm / CITY_DRIVE_SPEED_KPH) * 60 + TRANSFER_BUFFER_MINUTES));
  const minutesPerKm = minutes / Math.max(distanceKm, 0.2);
  const traffic = minutesPerKm > 4 ? "Possible traffic" : "Likely clear";

  return { distanceKm, minutes, traffic };
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
}

function categoryLabel(category: PlanStop["category"]) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function normalizedRating(rating: number | undefined) {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return 0;
  return Math.min(5, Math.max(0, rating));
}

function StarRating({ rating }: { rating: number | undefined }) {
  const value = normalizedRating(rating);
  const rounded = Math.round(value);

  return (
    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3.5 w-3.5",
              i < rounded ? "fill-gold text-gold" : "text-muted-foreground/40"
            )}
          />
        ))}
      </div>
      <span className="font-medium text-foreground">{value.toFixed(1)}</span>
      <span>/5</span>
    </div>
  );
}

function outfitItems(tempC: number, rainy: boolean, windy: boolean): string[] {
  const base: string[] =
    tempC >= 29 ? ["Breathable shirt", "Light pants", "Wide-brim hat", "Sunglasses", "Sunscreen"]
    : tempC >= 22 ? ["T-shirt / light shirt", "Comfortable pants", "Sunglasses"]
    : tempC >= 16 ? ["Light jacket", "Long pants", "Walking shoes"]
    : tempC >= 10 ? ["Warm jacket", "Layered top", "Long pants", "Closed shoes"]
    : ["Winter coat", "Warm layers", "Scarf", "Gloves", "Closed shoes"];

  if (rainy) base.push("Rain jacket / umbrella");
  if (windy) base.push("Windbreaker");
  base.push("Modest layer for holy sites");
  return base;
}

function tempMeta(temp: number): {
  label: string; color: string; bg: string; ring: string;
  Icon: typeof Sun; weatherIcon: typeof Sun;
} {
  if (temp >= 30) return { label: "Hot", color: "text-red-500", bg: "bg-red-500/10", ring: "ring-red-400/30", Icon: Flame, weatherIcon: Sun };
  if (temp >= 24) return { label: "Warm", color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-400/30", Icon: Sun, weatherIcon: Sun };
  if (temp >= 17) return { label: "Mild", color: "text-teal-500", bg: "bg-teal-500/10", ring: "ring-teal-400/30", Icon: CloudSun, weatherIcon: CloudSun };
  if (temp >= 10) return { label: "Cool", color: "text-blue-500", bg: "bg-blue-500/10", ring: "ring-blue-400/30", Icon: Wind, weatherIcon: Wind };
  return { label: "Cold", color: "text-indigo-500", bg: "bg-indigo-500/10", ring: "ring-indigo-400/30", Icon: Snowflake, weatherIcon: CloudSnow };
}

const TIME_SLOTS = [
  {
    key: "Morning",
    Icon: Sunrise,
    label: "Morning",
    sublabel: "6 am – 12 pm",
    gradientClass: "from-amber-400/15 via-orange-300/10 to-transparent",
    accentColor: "text-amber-500",
    accentBg: "bg-amber-500/10",
    deltaT: -2,
    note: "Start slightly layered — temperatures rise quickly once the sun is up.",
  },
  {
    key: "Afternoon",
    Icon: Sun,
    label: "Afternoon",
    sublabel: "12 pm – 6 pm",
    gradientClass: "from-yellow-400/15 via-amber-300/10 to-transparent",
    accentColor: "text-yellow-500",
    accentBg: "bg-yellow-400/10",
    deltaT: +2,
    note: "Peak heat — prioritize breathable fabrics and sun protection.",
  },
  {
    key: "Evening",
    Icon: Moon,
    label: "Evening",
    sublabel: "6 pm – midnight",
    gradientClass: "from-indigo-400/15 via-violet-300/10 to-transparent",
    accentColor: "text-indigo-400",
    accentBg: "bg-indigo-400/10",
    deltaT: -4,
    note: "Temperatures drop — always carry a layer for the coast or hill areas.",
  },
] as const;

function clothingPlan(plan: GeneratedPlan) {
  const feels = plan.weather.feelsLikeC ?? plan.weather.tempC;
  const rainy = plan.weather.isRainy || plan.weather.precipitationMm > 0.5;
  const windy = plan.weather.windKph >= 24;

  return TIME_SLOTS.map((slot) => {
    const temp = Math.round(feels + slot.deltaT);
    return {
      ...slot,
      temp,
      items: outfitItems(temp, rainy, windy),
      rainy,
      windy,
    };
  });
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
  const drive = drivingSummary(plan);
  const currency = plan.budgetCurrency ?? "USD";
  const clothes = clothingPlan(plan);
  const stats = [
    { label: "Drive time", value: formatHours(drive.driveMinutes), icon: Car },
    { label: "Distance", value: `${drive.distanceKm} km`, icon: Route },
    { label: "Gasoline", value: `${drive.fuelLiters} L`, icon: Fuel },
    { label: "Visit time", value: formatHours(totalMinutes(plan)), icon: Clock },
    { label: "Stops", value: totalStops(plan), icon: MapPinned },
    { label: "Est. spend", value: totalCost(plan) > 0 ? formatMoney(totalCost(plan), currency) : formatMoney(0, currency), icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elegant animate-fade-up">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
                <Sparkles className="h-3 w-3" />
                {t(lang, "overview")}
              </Badge>
              <Badge variant="outline" className="gap-1 border-gold/30 bg-gold/10 text-gold-foreground">
                <CalendarDays className="h-3 w-3" />
                {plan.days.length} {plan.days.length === 1 ? t(lang, "day") : `${t(lang, "day")}s`}
              </Badge>
            </div>

            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-balance">
              {plan.destination}
            </h2>
            <p className="mt-3 max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
              {plan.overview}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-border bg-gradient-card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {label}
                  </div>
                  <div className="mt-2 truncate text-lg font-bold text-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {plan.smartInsights.length > 0 && (
            <div className="border-t border-border bg-secondary/35 p-5 sm:p-6 lg:border-s lg:border-t-0">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gold-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Sparkles className="h-4 w-4" />
                </span>
                {t(lang, "smart_insights")}
              </div>
              <ul className="space-y-3">
                {plan.smartInsights.map((s, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-border/70 bg-surface/80 p-3 text-sm text-foreground/80 leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-gold-foreground">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── Clothing by time of day ── */}
      <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/6 via-background to-gold/8 shadow-elegant animate-fade-up overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border/50">
          <div>
            <Badge variant="outline" className="gap-1.5 border-primary/25 bg-primary/5 text-primary mb-2">
              <CloudSun className="h-3 w-3" />
              What to wear
            </Badge>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Clothes by time of day</h3>
          </div>

          {/* Live weather chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
              <Thermometer className="h-3.5 w-3.5 text-primary" />
              Feels like {plan.weather.feelsLikeC}°C
            </div>
            {plan.weather.precipitationMm > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                <Droplets className="h-3.5 w-3.5" />
                {plan.weather.precipitationMm} mm
              </div>
            )}
            {plan.weather.isRainy && (
              <div className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 shadow-sm dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
                <CloudRain className="h-3.5 w-3.5" />
                Rain expected
              </div>
            )}
            {plan.weather.windKph >= 24 && (
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Wind className="h-3.5 w-3.5" />
                {plan.weather.windKph} km/h
              </div>
            )}
            {plan.weather.isCold && (
              <div className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                <Snowflake className="h-3.5 w-3.5" />
                Cold
              </div>
            )}
            {plan.weather.isHot && (
              <div className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 shadow-sm dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <Flame className="h-3.5 w-3.5" />
                Hot
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <Wind className="h-3 w-3 text-muted-foreground/60" />
              {plan.weather.summary}
            </div>
          </div>
        </div>

        {/* Time-of-day cards */}
        <div className="grid gap-0 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50 px-0">
          {clothes.map((slot) => {
            const meta = tempMeta(slot.temp);
            const WeatherIcon = meta.weatherIcon;
            return (
              <div
                key={slot.key}
                className={cn(
                  "relative flex flex-col gap-0 p-5 sm:p-6 bg-gradient-to-b",
                  slot.gradientClass,
                )}
              >
                {/* Time label + big weather icon */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ring-1", slot.accentBg, "ring-border/40")}>
                      <slot.Icon className={cn("h-5 w-5", slot.accentColor)} />
                    </span>
                    <div>
                      <div className="text-sm font-bold text-foreground leading-tight">{slot.label}</div>
                      <div className="text-[11px] text-muted-foreground font-medium">{slot.sublabel}</div>
                    </div>
                  </div>

                  {/* Temperature badge */}
                  <div className={cn(
                    "flex items-center gap-1 rounded-xl px-2.5 py-1.5 ring-1 shadow-sm",
                    meta.bg, meta.ring,
                  )}>
                    <meta.Icon className={cn("h-3.5 w-3.5", meta.color)} />
                    <span className={cn("text-sm font-bold tabular-nums", meta.color)}>{slot.temp}°</span>
                    <span className={cn("text-[10px] font-semibold", meta.color)}>{meta.label}</span>
                  </div>
                </div>

                {/* Big weather icon + condition badges */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1", meta.bg, meta.ring)}>
                    <WeatherIcon className={cn("h-6 w-6", meta.color)} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {slot.rainy && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:bg-sky-950 dark:text-sky-300">
                        <Umbrella className="h-2.5 w-2.5" /> Rain
                      </span>
                    )}
                    {slot.windy && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Wind className="h-2.5 w-2.5" /> Windy
                      </span>
                    )}
                    {slot.temp < 10 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                        <Snowflake className="h-2.5 w-2.5" /> Freezing
                      </span>
                    )}
                    {slot.temp >= 30 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-500 dark:bg-red-950 dark:text-red-300">
                        <Flame className="h-2.5 w-2.5" /> Heat
                      </span>
                    )}
                  </div>
                </div>

                {/* Outfit chips */}
                <div className="flex flex-wrap gap-1.5">
                  {slot.items.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center rounded-lg border border-border/60 bg-surface/80 px-2.5 py-1 text-xs font-medium text-foreground/80 shadow-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {/* Note */}
                <p className="mt-3.5 text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
                  {slot.note}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="space-y-6">
        {plan.days.map((day, idx) => {
          const stopMarkers = day.stops.map((s, i) => ({ lat: s.lat, lng: s.lng, title: s.title, n: i + 1 }));
          return (
            <section
              key={day.dayNumber}
              onMouseEnter={() => onHoverStops?.(stopMarkers)}
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elegant animate-fade-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <header className="border-b border-border bg-gradient-to-r from-primary/8 to-transparent px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg gradient-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                    {t(lang, "day")} {day.dayNumber}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{day.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{day.summary}</p>
                  </div>
                </div>
              </header>

              <ol className="divide-y divide-border bg-background/35">
                {day.stops.map((stop, i) => {
                  const Icon = CATEGORY_ICON[stop.category] ?? Building2;
                  const nextStop = day.stops[i + 1];
                  const nextDrive = nextStop ? driveLegEstimate(stop, nextStop) : null;
                  return (
                    <li key={i} className="group grid grid-cols-[44px_1fr] gap-4 bg-surface px-4 py-4 transition-colors hover:bg-secondary/25 sm:grid-cols-[54px_1fr] sm:px-6 sm:py-5">
                      <div className="relative flex flex-col items-center gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 font-bold text-gold-foreground">
                          <span>{i + 1}</span>
                        </div>
                        <div className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">{stop.time}</div>
                      </div>

                      <div className="grid min-w-0 gap-4 lg:grid-cols-[190px_1fr]">
                        <div className="relative overflow-hidden rounded-xl border border-border bg-secondary aspect-[16/11] lg:h-[144px] lg:aspect-auto">
                          <PlaceImage stop={stop} destination={plan.destination} />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/65 to-transparent p-3">
                            <Badge className="gap-1 rounded-full border-white/30 bg-white/90 text-[11px] text-foreground hover:bg-white" variant="outline">
                              <Icon className="h-3 w-3 text-primary" />
                              {categoryLabel(stop.category)}
                            </Badge>
                          </div>
                        </div>

                        <div className="min-w-0 py-0.5">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <h4 className="font-semibold text-lg leading-tight">{stop.title}</h4>
                              </div>
                              <div className="mt-2">
                                <StarRating rating={stop.reviewRating} />
                              </div>
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

                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed text-pretty">
                            {stop.description}
                          </p>

                          <div className="mt-4 flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1"><Clock className="h-3 w-3" /> {stop.durationMinutes} min</span>
                            {stop.estimatedCostUsd > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1"><DollarSign className="h-3 w-3" /> ~{formatMoney(stop.estimatedCostUsd, currency)}</span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                              <ShieldCheck className="h-3 w-3" />
                              {stop.weatherFit}
                            </span>
                            {stop.address && <span className="truncate max-w-[240px] rounded-full border border-border bg-background px-2.5 py-1">{stop.address}</span>}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button asChild size="sm" className="rounded-full gap-1.5 gradient-primary text-primary-foreground shadow-sm">
                              <a href={wazeUrl(stop.lat, stop.lng)} target="_blank" rel="noopener noreferrer">
                                <Navigation2 className="h-3.5 w-3.5" />
                                {t(lang, "navigate")}
                              </a>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="rounded-full gap-1.5 border-primary/25 text-primary">
                              <a href={`https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`} target="_blank" rel="noopener noreferrer">
                                <MapPinned className="h-3.5 w-3.5" />
                                Map
                              </a>
                            </Button>
                          </div>

                          {nextStop && nextDrive && (
                            <div className="mt-4 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/7 via-background to-gold/8">
                              <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                    <Car className="h-4 w-4" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                                      Next drive
                                    </div>
                                    <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                                      <span className="text-muted-foreground">{stop.title}</span>
                                      <span className="mx-2 text-primary">→</span>
                                      <span>{nextStop.title}</span>
                                    </p>
                                  </div>
                                </div>
                                <Button asChild size="sm" className="rounded-full gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                                  <a href={wazeUrl(nextStop.lat, nextStop.lng)} target="_blank" rel="noopener noreferrer">
                                    <Navigation2 className="h-3.5 w-3.5" />
                                    Waze
                                  </a>
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 border-t border-primary/10 bg-surface/70 text-xs sm:grid-cols-3">
                                <span className="inline-flex items-center gap-2 px-3 py-2 text-muted-foreground">
                                  <Route className="h-3.5 w-3.5 text-primary" />
                                  <span><strong className="text-foreground">{nextDrive.distanceKm} km</strong> distance</span>
                                </span>
                                <span className="inline-flex items-center gap-2 border-t border-primary/10 px-3 py-2 text-muted-foreground sm:border-s sm:border-t-0">
                                  <Clock className="h-3.5 w-3.5 text-primary" />
                                  <span><strong className="text-foreground">{formatHours(nextDrive.minutes)}</strong> drive</span>
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-2 border-t border-primary/10 px-3 py-2 sm:border-s sm:border-t-0",
                                    nextDrive.traffic === "Possible traffic"
                                      ? "text-gold-foreground"
                                      : "text-primary"
                                  )}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  <strong>{nextDrive.traffic}</strong>
                                </span>
                              </div>
                            </div>
                          )}
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
                  <span className="text-sm font-bold text-foreground">{formatMoney(a.pricePerNightUsd, currency)}<span className="text-xs font-normal text-muted-foreground"> / night</span></span>
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
                  <span className="text-base font-bold text-primary">{formatMoney(tour.pricePerPersonUsd, currency)}</span>
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
