export type WeatherResult = { temperature: number; precipitation: number; code: number };

const CACHE_KEY = "careerflow-weather-cache";
const CACHE_TTL = 6 * 60 * 60 * 1000;

type Cached = { fetchedAt: number; value?: WeatherResult };

function cacheKey(place: string, date: string) {
  return `${place.trim().toLowerCase()}|${date}`;
}

export async function getWeather(place: string, date: string): Promise<WeatherResult | undefined> {
  const target = new Date(`${date}T00:00:00+09:00`).getTime();
  const now = Date.now();
  if (!place || !date || target < now - 86400000 || target > now + 7 * 86400000) return undefined;
  const key = cacheKey(place, date);
  let cache: Record<string, Cached> = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
  if (cache[key] && now - cache[key].fetchedAt < CACHE_TTL) return cache[key].value;
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`);
    if (!geo.ok) throw new Error("geocoding failed");
    const location = (await geo.json()).results?.[0];
    if (!location) throw new Error("place not found");
    const forecast = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=7`);
    if (!forecast.ok) throw new Error("forecast failed");
    const daily = (await forecast.json()).daily;
    const index = daily.time.indexOf(date);
    if (index < 0) throw new Error("date unavailable");
    const value = { temperature: Math.round(daily.temperature_2m_max[index]), precipitation: Math.round(daily.precipitation_probability_max[index] || 0), code: daily.weather_code[index] };
    cache[key] = { fetchedAt: now, value };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return value;
  } catch (error) {
    console.warn("[weather] lookup failed", { place, date, error });
    cache[key] = { fetchedAt: now };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* cache is optional */ }
    return undefined;
  }
}

export async function getWeatherByCoordinates(latitude: number, longitude: number, date: string): Promise<WeatherResult | undefined> {
  const target = new Date(`${date}T00:00:00+09:00`).getTime();
  if (target < Date.now() - 86400000 || target > Date.now() + 7 * 86400000) return undefined;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=7`;
  try {
    console.info("[weather] forecast request", { latitude, longitude, url });
    const response = await fetch(url);
    const body = await response.text();
    console.info("[weather] forecast response", { status: response.status, body });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const daily = JSON.parse(body).daily;
    const index = daily.time.indexOf(date);
    if (index < 0) return undefined;
    return { temperature: Math.round(daily.temperature_2m_max[index]), precipitation: Math.round(daily.precipitation_probability_max[index] || 0), code: daily.weather_code[index] };
  } catch (error) {
    console.warn("[weather] coordinate request failed", { latitude, longitude, url, error });
    return undefined;
  }
}
