export type WeatherResult = { temperature: number; precipitation: number; code: number; forecastTime: string; provider: "jma" | "open-meteo-general" };
export type WeatherTrace = { url?: string; cacheHit?: boolean; cacheKey?: string; cachedAt?: number; expiresAt?: number; provider?: string; status?: number; responseOk?: boolean; hourlySummary?: string; selectedProbability?: number; target?: string; index?: number; selectedTime?: string; branch?: string; error?: string };

const CACHE_KEY = "careerflow-weather-cache";
const CACHE_TTL = 6 * 60 * 60 * 1000;

type Cached = { fetchedAt: number; expiresAt: number; provider: "jma" | "open-meteo-general"; value: WeatherResult };
const WEATHER_CACHE_VERSION = "weather:jma:v2";
const NETWORK_VERIFY_KEY = "careerflow-weather-jma-network-verified";

function cacheKey(place: string, date: string) {
  return `${place.trim().toLowerCase()}|${date}`;
}

export async function getWeather(place: string, date: string): Promise<WeatherResult | undefined> {
  const day = date.slice(0, 10);
  const hour = date.slice(0, 13);
  const target = new Date(`${day}T00:00:00+09:00`).getTime();
  const now = Date.now();
  if (!place || !date || target < now - 86400000 || target > now + 7 * 86400000) return undefined;
  const key = `${WEATHER_CACHE_VERSION}:geocode:${cacheKey(place, hour)}`;
  let cache: Record<string, Cached> = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
  if (cache[key] && now < cache[key].expiresAt) return cache[key].value;
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`);
    console.info("[weather] geocode response", { place, status: geo.status });
    if (!geo.ok) throw new Error("geocoding failed");
    const location = (await geo.json()).results?.[0];
    if (!location) throw new Error("place not found");
    const forecast = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=weather_code,temperature_2m,precipitation_probability&timezone=Asia%2FTokyo&forecast_days=7`);
    if (!forecast.ok) throw new Error("forecast failed");
    const hourly = (await forecast.json()).hourly;
    const index = hourly.time.findIndex((value: string) => value.startsWith(`${hour}:00`));
    if (index < 0) throw new Error("date unavailable");
    const value = { temperature: Math.round(hourly.temperature_2m[index]), precipitation: Math.round(hourly.precipitation_probability[index] || 0), code: hourly.weather_code[index], forecastTime: hourly.time[index], provider: "open-meteo-general" as const };
    cache[key] = { fetchedAt: now, expiresAt: now + CACHE_TTL, provider: "open-meteo-general", value: { ...value, provider: "open-meteo-general" } };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return value;
  } catch (error) {
    console.warn("[weather] lookup failed", { place, date, error });
    delete cache[key];
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* cache is optional */ }
    return undefined;
  }
}

export async function getWeatherByCoordinates(latitude: number, longitude: number, date: string, onTrace?: (trace: WeatherTrace) => void): Promise<WeatherResult | undefined> {
  const day = date.slice(0, 10);
  const hour = date.slice(0, 13);
  const target = new Date(`${day}T00:00:00+09:00`).getTime();
  if (target < Date.now() - 86400000 || target > Date.now() + 7 * 86400000) return undefined;
  const key = `${WEATHER_CACHE_VERSION}:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${hour}:Asia/Tokyo`;
  let cache: Record<string, Cached> = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
  const forceNetwork = localStorage.getItem(NETWORK_VERIFY_KEY) !== "true";
  if (!forceNetwork && cache[key] && Date.now() < cache[key].expiresAt) { onTrace?.({ cacheHit: true, cacheKey: key, cachedAt: cache[key].fetchedAt, expiresAt: cache[key].expiresAt, provider: cache[key].provider, branch: "cache" }); return cache[key].value; }
  try {
    const params = `latitude=${latitude}&longitude=${longitude}&hourly=weather_code,temperature_2m,precipitation_probability&timezone=Asia%2FTokyo&forecast_days=7`;
    const urls = [`https://api.open-meteo.com/v1/jma?${params}`, `https://api.open-meteo.com/v1/forecast?${params}`];
    let hourly: any;
    let selectedUrl = "";
    for (const url of urls) {
      onTrace?.({ url, cacheHit: false, cacheKey: key, target: `${hour}:00`, branch: url.includes("/jma?") ? "jma-fetch" : "forecast-fallback", provider: url.includes("/jma?") ? "jma" : "open-meteo-general" });
      console.info("[weather] forecast request", { latitude, longitude, url });
      const response = await fetch(url);
      const body = await response.text();
      onTrace?.({ url, status: response.status, responseOk: response.ok });
      console.info("[weather] forecast response", { status: response.status, body });
      if (!response.ok) continue;
      const parsed = JSON.parse(body);
      if (!parsed.hourly) continue;
      hourly = parsed.hourly;
      selectedUrl = url;
      break;
    }
    if (!hourly) throw new Error("JMA and forecast endpoints failed");
    const index = hourly.time.findIndex((value: string) => value === `${hour}:00` || value.startsWith(`${hour}:00`));
    onTrace?.({ url: selectedUrl, hourlySummary: JSON.stringify({ time: hourly.time?.slice(0, 3), precipitation_probability: hourly.precipitation_probability?.slice(0, 3) }), selectedProbability: index >= 0 ? hourly.precipitation_probability[index] : undefined, target: `${hour}:00`, index, selectedTime: index >= 0 ? hourly.time[index] : undefined, branch: index < 0 ? "hour-index-miss" : "matched" });
    if (index < 0) return undefined;
    const provider: "jma" | "open-meteo-general" = selectedUrl.includes("/jma?") ? "jma" : "open-meteo-general";
    const fetchedAt = Date.now();
    const value = { temperature: Math.round(hourly.temperature_2m[index]), precipitation: Math.round(hourly.precipitation_probability[index] || 0), code: hourly.weather_code[index], forecastTime: hourly.time[index], provider };
    cache[key] = { fetchedAt, expiresAt: fetchedAt + CACHE_TTL, provider, value };
    if (provider === "jma") localStorage.setItem(NETWORK_VERIFY_KEY, "true");
    onTrace?.({ cacheKey: key, cachedAt: fetchedAt, expiresAt: fetchedAt + CACHE_TTL, provider });
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return value;
  } catch (error) {
    onTrace?.({ branch: "error", error: String(error) });
    console.warn("[weather] coordinate request failed", { latitude, longitude, error });
    return undefined;
  }
}
