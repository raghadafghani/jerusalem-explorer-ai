import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  destination: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  budget: z.enum(["low", "medium", "luxury"]),
  budgetAmount: z.number().positive().optional(),
  budgetCurrency: z.enum(["USD", "ILS", "EUR", "JOD"]).optional().default("USD"),
  duration: z.enum(["half", "full", "multi"]),
  date: z.string().min(1).max(40),
  endDate: z.string().min(1).max(40).optional(),
  accommodation: z.boolean(),
  people: z.number().int().min(1).max(50),
  ages: z.string().max(120).optional().default(""),
  interests: z.string().max(300).optional().default(""),
  planType: z.enum(["custom", "group"]),
  language: z.enum(["en", "ar", "he"]),
});

export type GeneratePlanInput = z.infer<typeof InputSchema>;

export type WeatherSnapshot = {
  tempC: number;
  feelsLikeC: number;
  precipitationMm: number;
  windKph: number;
  code: number;
  summary: string;
  isRainy: boolean;
  isHot: boolean;
  isCold: boolean;
};

export type PlanStop = {
  time: string;
  title: string;
  category: "attraction" | "restaurant" | "cafe" | "activity" | "accommodation" | "tour";
  description: string;
  wikiTitle?: string;
  imageUrl?: string;
  imageQuery?: string;
  reviewRating?: number;
  durationMinutes: number;
  estimatedCostUsd: number;
  reservation: "required" | "recommended" | "none";
  lat: number;
  lng: number;
  address?: string;
  weatherFit: "indoor" | "outdoor" | "either";
};

export type PlanDay = {
  dayNumber: number;
  title: string;
  summary: string;
  stops: PlanStop[];
};

export type GroupTour = {
  name: string;
  operator: string;
  schedule: string;
  durationHours: number;
  pricePerPersonUsd: number;
  languages: string[];
  meetingPoint: string;
  lat: number;
  lng: number;
  description: string;
};

export type AccommodationPick = {
  name: string;
  category: "hostel" | "boutique" | "hotel" | "luxury";
  pricePerNightUsd: number;
  description: string;
  lat: number;
  lng: number;
};

export type GeneratedPlan = {
  destination: string;
  budgetAmount?: number;
  budgetCurrency: "USD" | "ILS" | "EUR" | "JOD";
  weather: WeatherSnapshot;
  overview: string;
  smartInsights: string[];
  days: PlanDay[];
  accommodations: AccommodationPick[];
  groupTours: GroupTour[];
};

function requestedDayCount(data: GeneratePlanInput) {
  if (data.duration !== "multi") return 1;

  const start = new Date(data.date);
  const end = new Date(data.endDate ?? data.date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 3;

  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.min(10, Math.max(1, days));
}

function budgetLabel(data: GeneratePlanInput) {
  return data.budgetAmount
    ? `${data.budgetAmount} ${data.budgetCurrency} (${data.budget} tier)`
    : `${data.budget} budget`;
}

function buildFallbackPlan(data: GeneratePlanInput, weather: WeatherSnapshot): GeneratedPlan {
  const isJerusalem = data.destination.toLowerCase().includes("jerusalem");
  const isAkko = /\b(akko|acre|akka)\b/i.test(data.destination);
  const isHaifa = /\bhaifa\b/i.test(data.destination);
  const center = { lat: data.lat, lng: data.lng };
  const city = data.destination;
  const dayCount = requestedDayCount(data);

  const jerusalemDays: PlanDay[] = [
    {
      dayNumber: 1,
      title: `${city} essentials`,
      summary: "A compact route that balances major Old City sights, food, and weather-aware pacing.",
      stops: [
        {
          time: "09:00",
          title: "Jaffa Gate and Old City orientation",
          category: "attraction",
          description: "Start at Jaffa Gate, get oriented inside the Old City, and keep the route flexible for crowds and prayer times.",
          wikiTitle: "Jaffa_Gate",
          imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Jaffa_Gate-Jerusalem.jpg?width=640",
          imageQuery: "Jaffa Gate Jerusalem Old City",
          reviewRating: 4.7,
          durationMinutes: 60,
          estimatedCostUsd: 0,
          reservation: "none",
          lat: 31.7767,
          lng: 35.2272,
          weatherFit: "outdoor",
        },
        {
          time: "10:15",
          title: "Church of the Holy Sepulchre",
          category: "attraction",
          description: "Visit one of Jerusalem's most significant holy sites. Go earlier if you want a quieter visit.",
          wikiTitle: "Church_of_the_Holy_Sepulchre",
          imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Church_of_the_Holy_Sepulchre-Jerusalem.JPG?width=640",
          imageQuery: "Church of the Holy Sepulchre Jerusalem",
          reviewRating: 4.7,
          durationMinutes: 75,
          estimatedCostUsd: 0,
          reservation: "none",
          lat: 31.7784,
          lng: 35.2296,
          weatherFit: "indoor",
        },
        {
          time: "12:00",
          title: "Old City lunch near the market lanes",
          category: "restaurant",
          description: "Pause for hummus, falafel, or grilled dishes near the Christian and Muslim Quarter market streets.",
          wikiTitle: "Muslim_Quarter",
          imageQuery: "Jerusalem Old City market food",
          reviewRating: 4.5,
          durationMinutes: 60,
          estimatedCostUsd: data.budget === "low" ? 12 : 24,
          reservation: "none",
          lat: 31.778,
          lng: 35.2308,
          weatherFit: "either",
        },
        {
          time: "13:30",
          title: "Western Wall Plaza",
          category: "attraction",
          description: "Continue toward the Western Wall, allowing extra time for security checks and modest dress expectations.",
          wikiTitle: "Western_Wall",
          imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Western_Wall%2C_Jerusalem%2C.jpg?width=640",
          imageQuery: "Western Wall Jerusalem",
          reviewRating: 4.8,
          durationMinutes: 60,
          estimatedCostUsd: 0,
          reservation: "none",
          lat: 31.7767,
          lng: 35.2345,
          weatherFit: "outdoor",
        },
        {
          time: "15:00",
          title: weather.isRainy ? "Tower of David Museum" : "Mount of Olives viewpoint",
          category: "attraction",
          description: weather.isRainy
            ? "A strong indoor option with context for the city's history and views from sheltered areas."
            : "End with a wide view over the Old City; bring water and consider a taxi back if the climb is too much.",
          wikiTitle: weather.isRainy ? "Tower_of_David" : "Mount_of_Olives",
          imageUrl: weather.isRainy
            ? "https://commons.wikimedia.org/wiki/Special:FilePath/Tower_of_David_Museum_by_David_Shankbone.jpg?width=640"
            : "https://commons.wikimedia.org/wiki/Special:FilePath/Jerusalem_Mount_of_Olives.JPG?width=640",
          imageQuery: weather.isRainy ? "Tower of David Museum Jerusalem" : "Mount of Olives Jerusalem viewpoint",
          reviewRating: weather.isRainy ? 4.6 : 4.8,
          durationMinutes: 90,
          estimatedCostUsd: weather.isRainy ? 15 : 0,
          reservation: weather.isRainy ? "recommended" : "none",
          lat: weather.isRainy ? 31.7767 : 31.7781,
          lng: weather.isRainy ? 35.2282 : 35.2439,
          weatherFit: weather.isRainy ? "indoor" : "outdoor",
        },
      ],
    },
    {
      dayNumber: 2,
      title: "Museums, markets, and modern Jerusalem",
      summary: "A slower day with major cultural stops and a strong food-market anchor.",
      stops: [
        {
          time: "09:30",
          title: "Israel Museum",
          category: "attraction",
          description: "Start with archaeology, art, and the Shrine of the Book; this is a strong indoor anchor in rain or heat.",
          wikiTitle: "Israel_Museum",
          imageQuery: "Israel Museum Jerusalem",
          reviewRating: 4.7,
          durationMinutes: 150,
          estimatedCostUsd: 18,
          reservation: "recommended",
          lat: 31.7725,
          lng: 35.2042,
          weatherFit: "indoor",
        },
        {
          time: "12:30",
          title: "Mahane Yehuda Market lunch",
          category: "restaurant",
          description: "Eat through the market with casual tastings, bakeries, juice stands, and quick lunch counters.",
          wikiTitle: "Mahane_Yehuda_Market",
          imageQuery: "Mahane Yehuda Market Jerusalem",
          reviewRating: 4.6,
          durationMinutes: 90,
          estimatedCostUsd: data.budget === "low" ? 15 : 32,
          reservation: "none",
          lat: 31.7857,
          lng: 35.2124,
          weatherFit: "either",
        },
        {
          time: "14:30",
          title: "Knesset and Rose Garden area",
          category: "attraction",
          description: "Walk the civic district and nearby garden paths; keep this short if the weather is hot.",
          wikiTitle: "Knesset",
          imageQuery: "Knesset Jerusalem",
          reviewRating: 4.4,
          durationMinutes: 60,
          estimatedCostUsd: 0,
          reservation: "none",
          lat: 31.7767,
          lng: 35.2056,
          weatherFit: "outdoor",
        },
        {
          time: "16:00",
          title: "Tower of David Museum",
          category: "attraction",
          description: "End with a polished historical overview near Jaffa Gate, easy to pair with an evening Old City walk.",
          wikiTitle: "Tower_of_David",
          imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Tower_of_David_Museum_by_David_Shankbone.jpg?width=640",
          imageQuery: "Tower of David Museum Jerusalem",
          reviewRating: 4.6,
          durationMinutes: 90,
          estimatedCostUsd: 15,
          reservation: "recommended",
          lat: 31.7767,
          lng: 35.2282,
          weatherFit: "indoor",
        },
      ],
    },
    {
      dayNumber: 3,
      title: "Viewpoints and village atmosphere",
      summary: "A scenic day with wider views, quieter neighborhoods, and flexible outdoor stops.",
      stops: [
        {
          time: "09:00",
          title: "Mount of Olives viewpoint",
          category: "attraction",
          description: "Start early for the best view over the Old City and to avoid the warmest part of the day.",
          wikiTitle: "Mount_of_Olives",
          imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Jerusalem_Mount_of_Olives.JPG?width=640",
          imageQuery: "Mount of Olives Jerusalem viewpoint",
          reviewRating: 4.8,
          durationMinutes: 75,
          estimatedCostUsd: 0,
          reservation: "none",
          lat: 31.7781,
          lng: 35.2439,
          weatherFit: "outdoor",
        },
        {
          time: "11:00",
          title: "City of David",
          category: "attraction",
          description: "Explore archaeological layers just outside the Old City; some sections are better with advance tickets.",
          wikiTitle: "City_of_David",
          imageQuery: "City of David Jerusalem",
          reviewRating: 4.5,
          durationMinutes: 120,
          estimatedCostUsd: 16,
          reservation: "recommended",
          lat: 31.7732,
          lng: 35.2354,
          weatherFit: "either",
        },
        {
          time: "14:00",
          title: "Ein Kerem village walk",
          category: "activity",
          description: "Shift west for a calmer village feel, cafes, churches, galleries, and shaded lanes.",
          wikiTitle: "Ein_Karem",
          imageQuery: "Ein Kerem Jerusalem village",
          reviewRating: 4.6,
          durationMinutes: 120,
          estimatedCostUsd: 10,
          reservation: "none",
          lat: 31.7681,
          lng: 35.1611,
          weatherFit: "outdoor",
        },
      ],
    },
  ];

  const akkoStops: PlanStop[] = [
    {
      time: "09:30",
      title: "Old City of Acre walk",
      category: "attraction",
      description: "Start inside the UNESCO-listed Old City, moving through stone lanes, gates, and Ottoman-era streets.",
      wikiTitle: "Old_City_of_Acre",
      imageQuery: "Old City of Acre Akko",
      reviewRating: 4.7,
      durationMinutes: 90,
      estimatedCostUsd: 0,
      reservation: "none",
      lat: 32.9214,
      lng: 35.0689,
      weatherFit: "outdoor",
    },
    {
      time: "11:30",
      title: "Knights' Halls and Acre Citadel",
      category: "attraction",
      description: "Use the Crusader halls and citadel complex as the main heritage anchor of the day.",
      wikiTitle: "Hospitaller_fortress",
      imageQuery: "Knights Halls Acre Citadel Akko",
      reviewRating: 4.6,
      durationMinutes: 90,
      estimatedCostUsd: 13,
      reservation: "recommended",
      lat: 32.9229,
      lng: 35.0698,
      weatherFit: "indoor",
    },
    {
      time: "13:15",
      title: "Khan al-Umdan market lunch",
      category: "restaurant",
      description: "Pause around the caravanserai and nearby market lanes for seafood, hummus, pastries, or coffee.",
      wikiTitle: "Khan_al-Umdan",
      imageQuery: "Khan al-Umdan Akko market",
      reviewRating: 4.5,
      durationMinutes: 75,
      estimatedCostUsd: data.budget === "low" ? 14 : 28,
      reservation: "none",
      lat: 32.9199,
      lng: 35.069,
      weatherFit: "either",
    },
    {
      time: "15:00",
      title: "Acre port and sea walls",
      category: "activity",
      description: "Finish by the fishing port and sea walls for breezes, photos, and a slower waterfront walk.",
      wikiTitle: "Acre,_Israel",
      imageQuery: "Acre Akko fishing port sea walls",
      reviewRating: 4.6,
      durationMinutes: 90,
      estimatedCostUsd: 0,
      reservation: "none",
      lat: 32.9182,
      lng: 35.0672,
      weatherFit: "outdoor",
    },
  ];

  const haifaStops: PlanStop[] = [
    {
      time: "09:30",
      title: "Baháʼí Gardens and World Centre viewpoint",
      category: "attraction",
      description: "Start with Haifa's signature terraces and views over the bay; check guided tour access before arrival.",
      wikiTitle: "Baháʼí_World_Centre",
      imageQuery: "Bahai Gardens Haifa",
      reviewRating: 4.8,
      durationMinutes: 90,
      estimatedCostUsd: 0,
      reservation: "recommended",
      lat: 32.8144,
      lng: 34.9869,
      weatherFit: "outdoor",
    },
    {
      time: "11:30",
      title: "German Colony, Haifa",
      category: "attraction",
      description: "Walk the restored Templer streets below the gardens, with cafes and views back up the terraces.",
      wikiTitle: "German_Colony,_Haifa",
      imageQuery: "German Colony Haifa",
      reviewRating: 4.5,
      durationMinutes: 75,
      estimatedCostUsd: 0,
      reservation: "none",
      lat: 32.82,
      lng: 34.9906,
      weatherFit: "outdoor",
    },
    {
      time: "13:00",
      title: "Wadi Nisnas market lunch",
      category: "restaurant",
      description: "Head into Wadi Nisnas for street food, bakeries, coffee, and local Arab neighborhood atmosphere.",
      wikiTitle: "Wadi_Nisnas",
      imageQuery: "Wadi Nisnas Haifa market",
      reviewRating: 4.6,
      durationMinutes: 75,
      estimatedCostUsd: data.budget === "low" ? 14 : 26,
      reservation: "none",
      lat: 32.8164,
      lng: 34.9964,
      weatherFit: "either",
    },
    {
      time: "15:00",
      title: "Stella Maris Monastery and Mount Carmel view",
      category: "activity",
      description: "Finish on Mount Carmel with sea views, monastery architecture, and an easy option for sunset photos.",
      wikiTitle: "Stella_Maris_Monastery",
      imageQuery: "Stella Maris Monastery Haifa",
      reviewRating: 4.6,
      durationMinutes: 90,
      estimatedCostUsd: 0,
      reservation: "none",
      lat: 32.8267,
      lng: 34.9703,
      weatherFit: "outdoor",
    },
  ];

  const genericStops: PlanStop[] = isAkko ? akkoStops : isHaifa ? haifaStops : [
        {
          time: "09:30",
          title: `${city} old center walk`,
          category: "attraction",
          description: `Start with the historic center of ${city}, keeping the first stop light so you can adjust to local opening hours.`,
          imageQuery: `${city} old city historic center`,
          reviewRating: 4.4,
          durationMinutes: 90,
          estimatedCostUsd: 0,
          reservation: "none",
          ...center,
          weatherFit: "outdoor",
        },
        {
          time: "11:30",
          title: "Local museum or heritage stop",
          category: "attraction",
          description: "Use this as the main indoor anchor if the weather turns rainy or hot.",
          imageQuery: `${city} museum heritage site`,
          reviewRating: 4.3,
          durationMinutes: 75,
          estimatedCostUsd: 10,
          reservation: "recommended",
          lat: data.lat + 0.004,
          lng: data.lng + 0.004,
          weatherFit: "indoor",
        },
        {
          time: "13:00",
          title: "Lunch near the central market",
          category: "restaurant",
          description: "Choose a casual local place and keep the route compact before the afternoon stops.",
          imageQuery: `${city} local restaurant market food`,
          reviewRating: 4.4,
          durationMinutes: 60,
          estimatedCostUsd: data.budget === "low" ? 12 : 25,
          reservation: "none",
          lat: data.lat + 0.002,
          lng: data.lng - 0.002,
          weatherFit: "either",
        },
        {
          time: "15:00",
          title: `${city} viewpoint or waterfront`,
          category: "activity",
          description: "Finish with an easy scenic stop; move this earlier if the day is hot.",
          imageQuery: `${city} viewpoint waterfront`,
          reviewRating: 4.5,
          durationMinutes: 90,
          estimatedCostUsd: 0,
          reservation: "none",
          lat: data.lat - 0.004,
          lng: data.lng + 0.005,
          weatherFit: "outdoor",
        },
      ];

  const days = isJerusalem
    ? Array.from({ length: dayCount }, (_, index) => {
        const template = jerusalemDays[index % jerusalemDays.length];
        return {
          ...template,
          dayNumber: index + 1,
          title: dayCount > jerusalemDays.length && index >= jerusalemDays.length
            ? `${city} flexible discovery day ${index + 1}`
            : template.title,
        };
      })
    : Array.from({ length: dayCount }, (_, index) => ({
        dayNumber: index + 1,
        title: index === 0 ? `${city} essentials` : `${city} discovery day ${index + 1}`,
        summary: index === 0
          ? "A compact route that balances major sights, food, and weather-aware pacing."
          : "A flexible follow-up day with nearby cultural, food, and scenic stops.",
        stops: genericStops.map((stop, stopIndex) => ({
          ...stop,
          lat: stop.lat + index * 0.006,
          lng: stop.lng + index * 0.006,
          title: index === 0 ? stop.title : `${stop.title} ${stopIndex === 0 ? "extension" : ""}`.trim(),
        })),
      }));

  return {
    destination: data.destination,
    budgetAmount: data.budgetAmount,
    budgetCurrency: data.budgetCurrency,
    weather,
    overview: `A practical ${data.duration === "half" ? "half-day" : data.duration === "multi" ? `${dayCount}-day` : "full-day"} plan for ${city}, tuned for ${weather.summary.toLowerCase()} and a ${budgetLabel(data)}.`,
    smartInsights: [
      weather.isRainy ? "Keep the indoor stops as anchors and use taxis between exposed areas." : "Carry water and keep outdoor viewpoints for morning or late afternoon.",
      "Check holy-site dress rules before entering religious places.",
      "On Fridays and holidays, markets and transport schedules can change early in the afternoon.",
    ],
    days,
    accommodations: data.accommodation
      ? [
          {
            name: `${city} central boutique stay`,
            category: data.budget === "luxury" ? "luxury" : data.budget === "low" ? "hostel" : "boutique",
            pricePerNightUsd: data.budget === "luxury" ? 260 : data.budget === "low" ? 45 : 140,
            description: "A central base that keeps walking and taxi times short.",
            lat: data.lat,
            lng: data.lng,
          },
        ]
      : [],
    groupTours: data.planType === "group"
      ? [
          {
            name: `${city} highlights guided tour`,
            operator: "Local licensed guide",
            schedule: "Daily morning departures, confirm before booking",
            durationHours: 4,
            pricePerPersonUsd: data.budget === "low" ? 35 : 65,
            languages: [data.language === "ar" ? "Arabic" : data.language === "he" ? "Hebrew" : "English"],
            meetingPoint: "Central meeting point",
            lat: data.lat,
            lng: data.lng,
            description: "A shared tour option for first-time visitors who want structure and local context.",
          },
        ]
      : [],
  };
}

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Rain showers", 81: "Heavy showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm",
};

async function fetchWeather(lat: number, lng: number, date: string): Promise<WeatherSnapshot> {
  // Try forecast for given date; fallback to current
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&start_date=${date}&end_date=${date}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather fetch failed");
    const data = (await res.json()) as any;
    const daily = data.daily;
    if (daily && daily.weather_code?.[0] !== undefined) {
      const code = daily.weather_code[0];
      const tempC = (daily.temperature_2m_max[0] + daily.temperature_2m_min[0]) / 2;
      const precip = daily.precipitation_sum[0] ?? 0;
      const wind = daily.wind_speed_10m_max[0] ?? 0;
      return {
        tempC: Math.round(tempC),
        feelsLikeC: Math.round(tempC),
        precipitationMm: precip,
        windKph: Math.round(wind),
        code,
        summary: WEATHER_CODES[code] ?? "Unknown",
        isRainy: precip > 1 || (code >= 51 && code <= 99),
        isHot: tempC > 30,
        isCold: tempC < 12,
      };
    }
    const cur = data.current;
    return {
      tempC: Math.round(cur.temperature_2m),
      feelsLikeC: Math.round(cur.apparent_temperature),
      precipitationMm: cur.precipitation ?? 0,
      windKph: Math.round(cur.wind_speed_10m ?? 0),
      code: cur.weather_code,
      summary: WEATHER_CODES[cur.weather_code] ?? "Unknown",
      isRainy: (cur.precipitation ?? 0) > 0.5,
      isHot: cur.temperature_2m > 30,
      isCold: cur.temperature_2m < 12,
    };
  } catch {
    return {
      tempC: 22, feelsLikeC: 22, precipitationMm: 0, windKph: 10,
      code: 1, summary: "Mainly clear", isRainy: false, isHot: false, isCold: false,
    };
  }
}

const SYSTEM_PROMPT = `You are Masari, an expert local travel agent specializing in Jerusalem and northern Israel (Galilee, Golan, coast — including Haifa, Nazareth, Tiberias, Akko, Safed, Caesarea, Rosh HaNikra, the Arab and Druze towns of the Galilee).

You speak with warmth, cultural sensitivity, and deep local knowledge. You know the holy sites of all faiths, the best hummus joints, the hidden viewpoints, the hiking trails, and which places require advance booking.

Generate a realistic, actionable, day-by-day itinerary as JSON via the structured tool. Rules:
- Adapt activities to the live weather provided. Rainy → museums, churches, mosques, markets, bathhouses, restaurants. Hot → early starts, shaded old cities, water activities, late-evening dining. Cold → indoor sites + warm food.
- Optimize routes geographically — group nearby stops on the same day. Provide REAL coordinates for each stop (use your knowledge of actual locations).
- Match budget: low ($-$$), medium ($$-$$$), luxury ($$$$).
- For every stop, include imageQuery with the real place name and city, an optional exact English Wikipedia wikiTitle when available, and reviewRating from 0 to 5 based on typical public review sentiment.
- For families with children, include kid-friendly stops. For older travelers, avoid steep climbs.
- Mark reservation status honestly. Western Wall tunnels, Tower of David sound & light, Bahá'í Gardens guided tour, Rosh HaNikra cable car (busy days) → required/recommended.
- Respond in the requested language for all user-facing text (titles, descriptions, summaries, insights). Coordinates and category enums stay in English.
- Smart insights should be specific and useful (e.g. "Friday afternoon: Old City markets close early — do shopping before 14:00").`;

const PLAN_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_plan",
    description: "Submit the structured travel plan",
    parameters: {
      type: "object",
      properties: {
        overview: { type: "string", description: "2-3 sentence overview of the trip" },
        smartInsights: { type: "array", items: { type: "string" }, description: "3-6 specific, actionable insights" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              dayNumber: { type: "number" },
              title: { type: "string" },
              summary: { type: "string" },
              stops: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    time: { type: "string", description: "HH:MM" },
                    title: { type: "string" },
                    category: { type: "string", enum: ["attraction", "restaurant", "cafe", "activity", "accommodation", "tour"] },
                    description: { type: "string" },
                    wikiTitle: { type: "string", description: "Optional exact English Wikipedia page title for this place, using underscores, e.g. Western_Wall" },
                    imageUrl: { type: "string", description: "Optional direct image URL from Wikimedia Commons or another reliable public source for this exact place" },
                    imageQuery: { type: "string", description: "Short search phrase for a representative photo of this specific place" },
                    reviewRating: { type: "number", minimum: 0, maximum: 5, description: "Estimated public review score from 0 to 5 stars" },
                    durationMinutes: { type: "number" },
                    estimatedCostUsd: { type: "number" },
                    reservation: { type: "string", enum: ["required", "recommended", "none"] },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    address: { type: "string" },
                    weatherFit: { type: "string", enum: ["indoor", "outdoor", "either"] },
                  },
                  required: ["time", "title", "category", "description", "imageQuery", "reviewRating", "durationMinutes", "estimatedCostUsd", "reservation", "lat", "lng", "weatherFit"],
                },
              },
            },
            required: ["dayNumber", "title", "summary", "stops"],
          },
        },
        accommodations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string", enum: ["hostel", "boutique", "hotel", "luxury"] },
              pricePerNightUsd: { type: "number" },
              description: { type: "string" },
              lat: { type: "number" },
              lng: { type: "number" },
            },
            required: ["name", "category", "pricePerNightUsd", "description", "lat", "lng"],
          },
        },
        groupTours: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              operator: { type: "string" },
              schedule: { type: "string" },
              durationHours: { type: "number" },
              pricePerPersonUsd: { type: "number" },
              languages: { type: "array", items: { type: "string" } },
              meetingPoint: { type: "string" },
              lat: { type: "number" },
              lng: { type: "number" },
              description: { type: "string" },
            },
            required: ["name", "operator", "schedule", "durationHours", "pricePerPersonUsd", "languages", "meetingPoint", "lat", "lng", "description"],
          },
        },
      },
      required: ["overview", "smartInsights", "days", "accommodations", "groupTours"],
    },
  },
};

export async function generatePlanData(input: unknown): Promise<GeneratedPlan> {
    const data = InputSchema.parse(input);
    const AI_API_KEY = process.env.AI_API_KEY;
    const AI_API_URL = process.env.AI_API_URL;
    const weather = await fetchWeather(data.lat, data.lng, data.date);

    if (!AI_API_KEY || !AI_API_URL) return buildFallbackPlan(data, weather);

    const langName = data.language === "ar" ? "Arabic" : data.language === "he" ? "Hebrew" : "English";
    const numDays = requestedDayCount(data);
    const dayHint = data.duration === "half" ? "Plan a HALF-DAY (~4-5 hours, 3-4 stops)." :
                    data.duration === "full" ? "Plan a FULL DAY (~8-10 hours, 5-7 stops)." :
                    `Plan ${numDays} days, 4-6 stops per day. Return exactly ${numDays} day objects.`;

    const userPrompt = `Destination: ${data.destination} (lat ${data.lat}, lng ${data.lng})
Date${data.endDate ? " range" : ""}: ${data.endDate ? `${data.date} to ${data.endDate}` : data.date}
Live weather: ${weather.tempC}°C, ${weather.summary}, precipitation ${weather.precipitationMm}mm, wind ${weather.windKph}km/h. ${weather.isRainy ? "RAINY — favor indoor activities." : ""} ${weather.isHot ? "HOT — favor early/late and shaded spots." : ""} ${weather.isCold ? "COLD — favor indoor/warm spots." : ""}
Budget: ${budgetLabel(data)}. Keep paid stops, meals, tours, and accommodation realistic for this total budget.
Group: ${data.people} people, ages: ${data.ages || "unspecified"}
Interests: ${data.interests || "general sightseeing"}
Plan style: ${data.planType === "group" ? "Recommend GROUP TOURS as the focus — fill groupTours with 3-5 real-style guided tours and include daily stops around tour meeting points." : "Custom personalized itinerary."}
Accommodation: ${data.accommodation ? `Include 3-4 accommodation picks matching the budget.` : "No accommodation needed — leave accommodations empty."}
Days to plan: ${numDays}. ${dayHint}
Language: write all titles, descriptions, summaries, insights in ${langName}.`;

    const aiRes = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [PLAN_TOOL],
        tool_choice: { type: "function", function: { name: "submit_plan" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      if (aiRes.status === 429) throw new Error("RATE_LIMIT");
      if (aiRes.status === 402) throw new Error("CREDITS_REQUIRED");
      throw new Error("AI_ERROR");
    }

    const aiJson = (await aiRes.json()) as any;
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response", JSON.stringify(aiJson).slice(0, 500));
      throw new Error("AI_ERROR");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return {
      destination: data.destination,
      budgetAmount: data.budgetAmount,
      budgetCurrency: data.budgetCurrency,
      weather,
      overview: parsed.overview,
      smartInsights: parsed.smartInsights ?? [],
      days: parsed.days ?? [],
      accommodations: data.accommodation ? (parsed.accommodations ?? []) : [],
      groupTours: parsed.groupTours ?? [],
    };
}

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratedPlan> => generatePlanData(data));
