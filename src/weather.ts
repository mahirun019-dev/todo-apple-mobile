export type WeatherResult = { temperature: number; precipitation: number; code: number; forecastTime: string };

const CACHE_KEY = "careerflow-weather-cache";
const CACHE_TTL = 6 * 60 * 60 * 1000;

type Cached = { fetchedAt: number; value?: WeatherResult };

function cacheKey(place: string, date: string) {
  return `${place.trim().toLowerCase()}|${date}`;
}

export async function getWeather(place: string, date: string): Promise<WeatherResult | undefined> {
  const day = date.slice(0, 10);
  const hour = date.slice(0, 13);
  const target = new Date(`${day}T00:00:00+09:00`).getTime();
  const now = Date.now();
  if (!place || !date || target < now - 86400000 || target > now + 7 * 86400000) return undefined;
  const key = cacheKey(place, hour);
  let cache: Record<string, Cached> = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
  if (cache[key] && now - cache[key].fetchedAt < CACHE_TTL) return cache[key].value;
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
    const value = { temperature: Math.round(hourly.temperature_2m[index]), precipitation: Math.round(hourly.precipitation_probability[index] || 0), code: hourly.weather_code[index], forecastTime: hourly.time[index] };
    cache[key] = { fetchedAt: now, value };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return value;
  } catch (error) {
    console.warn("[weather] lookup failed", { place, date, error });
    delete cache[key];
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* cache is optional */ }
    return undefined;
  }
}

export async function getWeatherByCoordinates(latitude: number, longitude: number, date: string): Promise<WeatherResult | undefined> {
  const day = date.slice(0, 10);
  const hour = date.slice(0, 13);
  const target = new Date(`${day}T00:00:00+09:00`).getTime();
  if (target < Date.now() - 86400000 || target > Date.now() + 7 * 86400000) return undefined;
  const key = `${latitude.toFixed(4)}|${longitude.toFixed(4)}|${hour}|Asia/Tokyo`;
  let cache: Record<string, Cached> = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
  if (cache[key] && Date.now() - cache[key].fetchedAt < CACHE_TTL) return cache[key].value;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=7`;
  try {
    console.info("[weather] forecast request", { latitude, longitude, url });
    const response = await fetch(url);
    const body = await response.text();
    console.info("[weather] forecast response", { status: response.status, body });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const hourly = JSON.parse(body).hourly;
    const index = hourly.time.findIndex((value: string) => value.startsWith(`${hour}:00`));
  if (index < 0) return undefined;
    const value = { temperature: Math.round(hourly.temperature_2m[index]), precipitation: Math.round(hourly.precipitation_probability[index] || 0), code: hourly.weather_code[index], forecastTime: hourly.time[index] };
    cache[key] = { fetchedAt: Date.now(), value };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return value;
  } catch (error) {
    console.warn("[weather] coordinate request failed", { latitude, longitude, url, error });
    return undefined;
  }
}
