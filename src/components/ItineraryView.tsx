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

// ── Curated place image map ──────────────────────────────────────────────────
const PLACE_IMAGES: { patterns: string[]; wikiTitle?: string; url?: string }[] = [
  // Jerusalem — landmarks
  { patterns: ["jaffa gate"], wikiTitle: "Jaffa_Gate", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Jaffa_Gate-Jerusalem.jpg?width=640" },
  { patterns: ["holy sepulchre", "church of the holy sepulchre", "sepulchre"], wikiTitle: "Church_of_the_Holy_Sepulchre", url: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Church_of_the_Holy_Sepulchre-Jerusalem.JPG?width=640" },
  { patterns: ["western wall", "wailing wall", "kotel"], wikiTitle: "Western_Wall", url: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Western_Wall%2C_Jerusalem%2C.jpg?width=640" },
  { patterns: ["dome of the rock", "al-aqsa", "temple mount", "haram al-sharif"], wikiTitle: "Dome_of_the_Rock" },
  { patterns: ["mount of olives", "olives viewpoint"], wikiTitle: "Mount_of_Olives", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Jerusalem_Mount_of_Olives.JPG?width=640" },
  { patterns: ["tower of david"], wikiTitle: "Tower_of_David", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Tower_of_David_Museum_by_David_Shankbone.jpg?width=640" },
  { patterns: ["israel museum"], wikiTitle: "Israel_Museum" },
  { patterns: ["mahane yehuda", "machane yehuda", "shuk"], wikiTitle: "Mahane_Yehuda_Market" },
  { patterns: ["knesset"], wikiTitle: "Knesset" },
  { patterns: ["city of david"], wikiTitle: "City_of_David" },
  { patterns: ["ein kerem", "ein karem"], wikiTitle: "Ein_Karem" },
  { patterns: ["garden of gethsemane", "gethsemane"], wikiTitle: "Garden_of_Gethsemane" },
  { patterns: ["yad vashem"], wikiTitle: "Yad_Vashem" },
  { patterns: ["old city lunch", "old city market", "market lanes", "muslim quarter", "christian quarter", "jewish quarter", "armenian quarter"], wikiTitle: "Muslim_Quarter" },
  { patterns: ["church of all nations", "basilica of the agony"], wikiTitle: "Church_of_All_Nations" },
  { patterns: ["mount zion", "king david's tomb", "room of the last supper"], wikiTitle: "Mount_Zion" },
  { patterns: ["davidson center", "archaeological park"], wikiTitle: "Jerusalem_Archaeological_Park" },
  { patterns: ["mamilla"], wikiTitle: "Mamilla_Mall" },
  { patterns: ["mea shearim"], wikiTitle: "Mea_Shearim" },
  // Tiberias & Sea of Galilee
  { patterns: ["tiberias old center", "tiberias old city", "tiberias waterfront", "tiberias promenade", "tiberias port", "tiberias walk", "old tiberias"], wikiTitle: "Tiberias" },
  { patterns: ["sea of galilee", "kinneret", "lake tiberias", "galilee waterfront", "galilee shore", "tiberias viewpoint", "lakefront tiberias", "lake shore"], wikiTitle: "Sea_of_Galilee" },
  { patterns: ["capernaum", "kfar nahum"], wikiTitle: "Capernaum" },
  { patterns: ["church of the multiplication", "multiplication of loaves", "tabgha"], wikiTitle: "Church_of_the_Multiplication_of_the_Loaves_and_Fish" },
  { patterns: ["mount of beatitudes", "beatitudes"], wikiTitle: "Mount_of_Beatitudes" },
  { patterns: ["baptism site", "yardenit", "jordan river baptism"], wikiTitle: "Yardenit" },
  { patterns: ["hamat tiberias", "hot springs tiberias", "tiberias hot spring"], wikiTitle: "Hamat_Tiberias_National_Park" },
  { patterns: ["tiberias mosque", "al-amari mosque"], wikiTitle: "Tiberias" },
  { patterns: ["tiberias museum", "local museum tiberias", "heritage tiberias", "tiberias heritage"], wikiTitle: "Tiberias" },
  { patterns: ["central market tiberias", "tiberias market", "lunch tiberias", "central market"], wikiTitle: "Tiberias" },
  // Nazareth
  { patterns: ["basilica of the annunciation", "annunciation", "church of annunciation"], wikiTitle: "Basilica_of_the_Annunciation" },
  { patterns: ["nazareth old market", "white mosque nazareth", "souk nazareth", "nazareth market"], wikiTitle: "Nazareth" },
  { patterns: ["nazareth village", "mary's well", "mary well"], wikiTitle: "Nazareth" },
  { patterns: ["mount precipice", "mount kedumim"], wikiTitle: "Mount_Precipice" },
  // Haifa
  { patterns: ["bahá", "bahai", "baháʼí", "world centre", "gardens haifa", "persian gardens"], wikiTitle: "Baháʼí_World_Centre" },
  { patterns: ["german colony", "german colony haifa"], wikiTitle: "German_Colony,_Haifa" },
  { patterns: ["wadi nisnas"], wikiTitle: "Wadi_Nisnas" },
  { patterns: ["stella maris", "mount carmel monastery"], wikiTitle: "Stella_Maris_Monastery" },
  { patterns: ["haifa port", "haifa bay"], wikiTitle: "Haifa" },
  { patterns: ["elijah's cave", "cave of elijah"], wikiTitle: "Cave_of_Elijah" },
  { patterns: ["tikotin museum", "haifa museum"], wikiTitle: "Tikotin_Museum_of_Japanese_Art" },
  { patterns: ["carmelit", "haifa cable car", "haifa subway"], wikiTitle: "Carmelit" },
  // Akko / Acre
  { patterns: ["old city of acre", "akko old center", "acre old city", "akko walls", "acre walls"], wikiTitle: "Old_City_of_Acre" },
  { patterns: ["knights' halls", "knights halls", "acre citadel", "crusader halls", "hospitaller"], wikiTitle: "Hospitaller_fortress" },
  { patterns: ["khan al-umdan", "akko market", "acre market", "akko souk"], wikiTitle: "Khan_al-Umdan" },
  { patterns: ["acre port", "akko port", "sea walls akko", "akko waterfront"], wikiTitle: "Acre,_Israel" },
  { patterns: ["jazzar mosque", "white mosque of acre", "al-jazzar"], wikiTitle: "El-Jazzar_Mosque" },
  { patterns: ["rosh hanikra", "rosh ha-nikra"], wikiTitle: "Rosh_HaNikra" },
  // Safed / Tzfat
  { patterns: ["safed old city", "tzfat old city", "artist quarter safed", "safed artist", "tzfat artist", "safed quarter"], wikiTitle: "Safed" },
  { patterns: ["safed synagogue", "tzfat synagogue", "ari synagogue", "joseph karo synagogue"], wikiTitle: "Safed" },
  { patterns: ["safed citadel", "tzfat citadel"], wikiTitle: "Safed" },
  // Caesarea
  { patterns: ["caesarea", "caesarea maritima", "caesarea theater", "caesarea aqueduct", "caesarea national park"], wikiTitle: "Caesarea_Maritima" },
  { patterns: ["caesarea harbor", "caesarea port"], wikiTitle: "Caesarea_Maritima" },
  // Golan Heights
  { patterns: ["golan heights", "nimrod fortress", "banias", "hermon", "majdal shams"], wikiTitle: "Golan_Heights" },
  { patterns: ["banias waterfall", "banias springs"], wikiTitle: "Banias" },
  { patterns: ["nimrod fortress", "nimrod castle"], wikiTitle: "Nimrod_Fortress" },
];

// ── Image resolution pipeline ─────────────────────────────────────────────────

function matchedPlaceImage(stop: PlanStop) {
  const text = `${stop.title} ${stop.imageQuery ?? ""}`.toLowerCase();
  return PLACE_IMAGES.find((img) => img.patterns.some((p) => text.includes(p)));
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

// Search Wikimedia Commons for a relevant image by keyword query
async function searchWikimediaImage(query: string): Promise<string | null> {
  try {
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=5&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { query?: { search?: { title: string }[] } };
    const results = data?.query?.search ?? [];
    // Pick the first result that looks like an image (not a map/diagram)
    const good = results.find((r) => {
      const t = r.title.toLowerCase();
      return !t.includes("map") && !t.includes("diagram") && !t.includes("flag") && !t.includes("logo") && !t.includes("icon") && !t.includes("coat");
    }) ?? results[0];
    if (!good) return null;
    const filename = good.title.replace(/^File:/i, "");
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=640`;
  } catch {
    return null;
  }
}

function PlaceImage({ stop, destination }: { stop: PlanStop; destination: string }) {
  const [src, setSrc] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSrc("");

    async function resolve() {
      // 1. Curated / AI-provided direct URL
      const curated = curatedImageUrl(stop);
      if (curated) { if (!cancelled) setSrc(curated); return; }

      // 2. Wikipedia article thumbnail (via wikiTitle)
      const wikiTitle = wikiTitleForStop(stop);
      if (wikiTitle) {
        try {
          const res = await fetch(wikiSummaryUrl(wikiTitle));
          if (res.ok) {
            const json = (await res.json()) as { thumbnail?: { source?: string }; originalimage?: { source?: string } };
            const img = json.thumbnail?.source ?? json.originalimage?.source;
            if (img && !cancelled) { setSrc(img); return; }
          }
        } catch { /* fall through */ }
      }

      // 3. Wikimedia Commons keyword search using imageQuery or stop title + destination
      const query = stop.imageQuery ?? `${stop.title} ${destination}`;
      const commonsImg = await searchWikimediaImage(query);
      if (commonsImg && !cancelled) { setSrc(commonsImg); return; }

      // 4. Fallback: search Wikimedia Commons by destination alone
      const cityImg = await searchWikimediaImage(`${destination} Israel landmark`);
      if (cityImg && !cancelled) { setSrc(cityImg); return; }

      // 5. Last resort: show placeholder
      if (!cancelled) setSrc("__placeholder__");
    }

    resolve();
    return () => { cancelled = true; };
  }, [stop, destination]);

  if (failed || src === "__placeholder__") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary text-muted-foreground">
        <ImageIcon className="h-7 w-7" />
        <span className="px-4 text-center text-xs font-medium">{stop.title}</span>
      </div>
    );
  }

  if (!src) {
    return <div className="h-full w-full animate-pulse bg-secondary" />;
  }

  return (
    <img
      src={src}
      alt={stop.title}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setFailed(true)}
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

function UserRatingButton({
  stopKey,
  rating,
  onRate,
}: {
  stopKey: string;
  rating: number;
  onRate: (key: string, value: number) => void;
}) {
  const [hovered, setHovered] = useState<number>(0);
  const active = rating > 0;

  return (
    <div className="flex items-center gap-1" title={active ? `Your rating: ${rating}/5` : "Rate this place"}>
      {Array.from({ length: 5 }).map((_, i) => {
        const value = i + 1;
        const filled = value <= (hovered || rating);
        return (
          <button
            key={i}
            type="button"
            aria-label={`Rate ${value} out of 5`}
            onClick={() => onRate(stopKey, value === rating ? 0 : value)}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <Star
              className={cn(
                "h-4 w-4 transition-all duration-100",
                filled
                  ? "fill-gold text-gold scale-110"
                  : "fill-transparent text-muted-foreground/40 hover:text-gold/60"
              )}
            />
          </button>
        );
      })}
      {active && (
        <span className="ml-1 text-[11px] font-semibold text-gold-foreground tabular-nums">{rating}/5</span>
      )}
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
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const handleRate = (key: string, value: number) =>
    setUserRatings((prev) => ({ ...prev, [key]: value }));

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

      <div className="space-y-5">
        {plan.days.map((day, idx) => {
          const stopMarkers = day.stops.map((s, i) => ({ lat: s.lat, lng: s.lng, title: s.title, n: i + 1 }));
          const dayTotalMin = day.stops.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);
          const dayTotalCost = day.stops.reduce((acc, s) => acc + (s.estimatedCostUsd ?? 0), 0);
          const totalDays = plan.days.length;
          return (
            <section
              key={day.dayNumber}
              onMouseEnter={() => onHoverStops?.(stopMarkers)}
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elegant animate-fade-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* ── Day header ── */}
              <header className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-gold/8 px-5 py-5 sm:px-7 sm:py-6">
                {/* Decorative large number watermark */}
                <span className="pointer-events-none select-none absolute -right-3 -top-4 text-[96px] font-black leading-none text-primary/5">
                  {day.dayNumber}
                </span>

                <div className="relative flex items-start gap-4 sm:gap-5">
                  {/* Day number badge */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl gradient-primary shadow-glow">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary-foreground/70 leading-none">
                        {t(lang, "day")}
                      </span>
                      <span className="text-3xl font-black text-primary-foreground leading-none mt-0.5">
                        {day.dayNumber}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                      of {totalDays}
                    </span>
                  </div>

                  {/* Title + summary + stats */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight text-balance">
                      {day.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed text-pretty max-w-2xl">
                      {day.summary}
                    </p>

                    {/* Quick stats */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-semibold text-foreground/80 shadow-sm backdrop-blur-sm">
                        <MapPinned className="h-3 w-3 text-primary" />
                        {day.stops.length} {day.stops.length === 1 ? "stop" : "stops"}
                      </span>
                      {dayTotalMin > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-semibold text-foreground/80 shadow-sm backdrop-blur-sm">
                          <Clock className="h-3 w-3 text-primary" />
                          {formatHours(dayTotalMin)}
                        </span>
                      )}
                      {dayTotalCost > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-semibold text-foreground/80 shadow-sm backdrop-blur-sm">
                          <DollarSign className="h-3 w-3 text-primary" />
                          ~{formatMoney(dayTotalCost, currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </header>

              <div className="bg-background/35">
                {day.stops.map((stop, i) => {
                  const Icon = CATEGORY_ICON[stop.category] ?? Building2;
                  const nextStop = day.stops[i + 1];
                  const nextDrive = nextStop ? driveLegEstimate(stop, nextStop) : null;
                  return (
                    <div key={i}>
                      {/* ── Stop card ── */}
                      <div className="group grid grid-cols-[44px_1fr] gap-4 bg-surface px-4 py-5 transition-colors hover:bg-secondary/20 sm:grid-cols-[54px_1fr] sm:px-6 sm:py-6 border-b border-border/60">
                        {/* Left column: number + time */}
                        <div className="flex flex-col items-center gap-2 pt-1">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 text-lg font-black text-gold-foreground">
                            {i + 1}
                          </div>
                          <div className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-mono font-semibold text-muted-foreground whitespace-nowrap">
                            {stop.time}
                          </div>
                        </div>

                        {/* Right column: image + content */}
                        <div className="grid min-w-0 gap-4 lg:grid-cols-[180px_1fr]">

                          {/* Image */}
                          <div className="relative overflow-hidden rounded-xl border border-border bg-secondary aspect-[16/11] lg:h-[140px] lg:aspect-auto">
                            <PlaceImage stop={stop} destination={plan.destination} />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/65 to-transparent p-3">
                              <Badge className="gap-1 rounded-full border-white/30 bg-white/90 text-[11px] text-foreground hover:bg-white" variant="outline">
                                <Icon className="h-3 w-3 text-primary" />
                                {categoryLabel(stop.category)}
                              </Badge>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex min-w-0 flex-col gap-2.5 py-0.5">

                            {/* Title row */}
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <h4 className="font-bold text-lg leading-tight">{stop.title}</h4>
                                <UserRatingButton
                                  stopKey={`${day.dayNumber}-${i}`}
                                  rating={userRatings[`${day.dayNumber}-${i}`] ?? 0}
                                  onRate={handleRate}
                                />
                              </div>
                              {stop.reservation !== "none" && (
                                <Badge
                                  className={cn(
                                    "gap-1 rounded-full text-[11px] font-medium flex-shrink-0",
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

                            {/* AI review rating */}
                            <StarRating rating={stop.reviewRating} />

                            {/* Description */}
                            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                              {stop.description}
                            </p>

                            {/* ── Info + Actions bar ── */}
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {/* Info chips */}
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground/75">
                                <Clock className="h-3 w-3 text-primary" />
                                {stop.durationMinutes} min
                              </span>
                              {stop.estimatedCostUsd > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground/75">
                                  <DollarSign className="h-3 w-3 text-primary" />
                                  ~{formatMoney(stop.estimatedCostUsd, currency)}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground/75">
                                <ShieldCheck className="h-3 w-3 text-primary" />
                                {stop.weatherFit}
                              </span>
                              {stop.address && (
                                <span className="inline-flex items-center gap-1.5 truncate max-w-[200px] rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground/75">
                                  <MapPinned className="h-3 w-3 text-primary flex-shrink-0" />
                                  {stop.address}
                                </span>
                              )}

                              {/* Divider */}
                              <span className="h-5 w-px bg-border mx-0.5" />

                              {/* Action buttons — same row */}
                              <Button asChild size="sm" className="rounded-full gap-1.5 gradient-primary text-primary-foreground shadow-sm h-7 px-3 text-xs">
                                <a href={wazeUrl(stop.lat, stop.lng)} target="_blank" rel="noopener noreferrer">
                                  <Navigation2 className="h-3 w-3" />
                                  {t(lang, "navigate")}
                                </a>
                              </Button>
                              <Button asChild size="sm" variant="outline" className="rounded-full gap-1.5 border-primary/25 text-primary h-7 px-3 text-xs">
                                <a href={`https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`} target="_blank" rel="noopener noreferrer">
                                  <MapPinned className="h-3 w-3" />
                                  Map
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Next Drive connector (outside the card) ── */}
                      {nextStop && nextDrive && (
                        <div className="relative flex items-center gap-3 px-5 py-2.5 sm:px-7 bg-gradient-to-r from-primary/5 via-background to-transparent border-b border-dashed border-primary/20">
                          {/* Vertical line accent */}
                          <div className="flex flex-shrink-0 flex-col items-center gap-0.5 self-stretch justify-center">
                            <div className="h-2 w-px bg-primary/30" />
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                              <Car className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="h-2 w-px bg-primary/30" />
                          </div>

                          {/* Route info */}
                          <div className="flex flex-1 min-w-0 items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Drive</span>
                            <span className="text-xs text-muted-foreground truncate">
                              <span className="font-medium text-foreground/70">{stop.title}</span>
                              <span className="mx-1.5 text-primary font-bold">→</span>
                              <span className="font-medium text-foreground">{nextStop.title}</span>
                            </span>
                          </div>

                          {/* Stats + Waze */}
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/70">
                              <Route className="h-3 w-3 text-primary" />{nextDrive.distanceKm} km
                            </span>
                            <span className="text-border">·</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/70">
                              <Clock className="h-3 w-3 text-primary" />{formatHours(nextDrive.minutes)}
                            </span>
                            {nextDrive.traffic !== "Clear" && (
                              <>
                                <span className="text-border">·</span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                                  <ShieldCheck className="h-3 w-3" />{nextDrive.traffic}
                                </span>
                              </>
                            )}
                            <Button asChild size="sm" className="rounded-full gap-1 h-6 px-2.5 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm ms-1">
                              <a href={wazeUrl(nextStop.lat, nextStop.lng)} target="_blank" rel="noopener noreferrer">
                                <Navigation2 className="h-3 w-3" />
                                Waze
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
