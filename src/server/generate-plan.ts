import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  destination: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  budget: z.enum(["low", "medium", "luxury"]),
  duration: z.enum(["half", "full", "multi"]),
  date: z.string().min(1).max(40),
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
  weather: WeatherSnapshot;
  overview: string;
  smartInsights: string[];
  days: PlanDay[];
  accommodations: AccommodationPick[];
  groupTours: GroupTour[];
};

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
                    durationMinutes: { type: "number" },
                    estimatedCostUsd: { type: "number" },
                    reservation: { type: "string", enum: ["required", "recommended", "none"] },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    address: { type: "string" },
                    weatherFit: { type: "string", enum: ["indoor", "outdoor", "either"] },
                  },
                  required: ["time", "title", "category", "description", "durationMinutes", "estimatedCostUsd", "reservation", "lat", "lng", "weatherFit"],
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

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<GeneratedPlan> => {
    const AI_API_KEY = process.env.AI_API_KEY;
    const AI_API_URL = process.env.AI_API_URL;
    if (!AI_API_KEY || !AI_API_URL) throw new Error("AI gateway not configured");

    const weather = await fetchWeather(data.lat, data.lng, data.date);

    const langName = data.language === "ar" ? "Arabic" : data.language === "he" ? "Hebrew" : "English";
    const numDays = data.duration === "multi" ? 3 : 1;
    const dayHint = data.duration === "half" ? "Plan a HALF-DAY (~4-5 hours, 3-4 stops)." :
                    data.duration === "full" ? "Plan a FULL DAY (~8-10 hours, 5-7 stops)." :
                    "Plan 3 days, 4-6 stops per day.";

    const userPrompt = `Destination: ${data.destination} (lat ${data.lat}, lng ${data.lng})
Date: ${data.date}
Live weather: ${weather.tempC}°C, ${weather.summary}, precipitation ${weather.precipitationMm}mm, wind ${weather.windKph}km/h. ${weather.isRainy ? "RAINY — favor indoor activities." : ""} ${weather.isHot ? "HOT — favor early/late and shaded spots." : ""} ${weather.isCold ? "COLD — favor indoor/warm spots." : ""}
Budget: ${data.budget}
Group: ${data.people} people, ages: ${data.ages || "unspecified"}
Interests: ${data.interests || "general sightseeing"}
Plan style: ${data.planType === "group" ? "Recommend GROUP TOURS as the focus — fill groupTours with 3-5 real-style guided tours; keep days minimal (1 day, 2-3 stops around tour meeting points)." : "Custom personalized itinerary."}
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
      weather,
      overview: parsed.overview,
      smartInsights: parsed.smartInsights ?? [],
      days: parsed.days ?? [],
      accommodations: data.accommodation ? (parsed.accommodations ?? []) : [],
      groupTours: parsed.groupTours ?? [],
    };
  });
