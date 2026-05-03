// Curated destinations in Jerusalem & northern Israel with coordinates
export type Destination = {
  id: string;
  names: { en: string; ar: string; he: string };
  region: "jerusalem" | "north";
  lat: number;
  lng: number;
};

export const DESTINATIONS: Destination[] = [
  { id: "jerusalem", names: { en: "Jerusalem", ar: "القدس", he: "ירושלים" }, region: "jerusalem", lat: 31.7683, lng: 35.2137 },
  { id: "haifa", names: { en: "Haifa", ar: "حيفا", he: "חיפה" }, region: "north", lat: 32.7940, lng: 34.9896 },
  { id: "nazareth", names: { en: "Nazareth", ar: "الناصرة", he: "נצרת" }, region: "north", lat: 32.7021, lng: 35.2978 },
  { id: "tiberias", names: { en: "Tiberias", ar: "طبريا", he: "טבריה" }, region: "north", lat: 32.7959, lng: 35.5300 },
  { id: "akko", names: { en: "Akko", ar: "عكا", he: "עכו" }, region: "north", lat: 32.9281, lng: 35.0818 },
  { id: "safed", names: { en: "Safed", ar: "صفد", he: "צפת" }, region: "north", lat: 32.9650, lng: 35.4956 },
  { id: "rosh_hanikra", names: { en: "Rosh HaNikra", ar: "رأس الناقورة", he: "ראש הנקרה" }, region: "north", lat: 33.0892, lng: 35.1064 },
  { id: "golan", names: { en: "Golan Heights", ar: "هضبة الجولان", he: "רמת הגולן" }, region: "north", lat: 33.0000, lng: 35.7500 },
  { id: "caesarea", names: { en: "Caesarea", ar: "قيسارية", he: "קיסריה" }, region: "north", lat: 32.5000, lng: 34.8919 },
  { id: "shfaram", names: { en: "Shfaram", ar: "شفاعمرو", he: "שפרעם" }, region: "north", lat: 32.8067, lng: 35.1700 },
  { id: "umm_al_fahm", names: { en: "Umm al-Fahm", ar: "أم الفحم", he: "אום אל-פחם" }, region: "north", lat: 32.5197, lng: 35.1517 },
];

export function findDestination(query: string): Destination | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  for (const d of DESTINATIONS) {
    const variants = [d.id, d.names.en, d.names.ar, d.names.he].map((s) => s.toLowerCase());
    if (variants.some((v) => v === q || v.includes(q) || q.includes(v))) return d;
  }
  return null;
}
