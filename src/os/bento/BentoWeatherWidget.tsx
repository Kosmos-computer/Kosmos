import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";

interface WeatherCity {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

interface WeatherCurrent {
  temperatureC: number;
  humidity: number;
  windKmh: number;
  condition: string;
  observedAt: string;
}

const CITIES: WeatherCity[] = [
  { id: "sf", label: "SF", latitude: 37.7749, longitude: -122.4194 },
  { id: "nyc", label: "NYC", latitude: 40.7128, longitude: -74.006 },
  { id: "london", label: "London", latitude: 51.5074, longitude: -0.1278 },
  { id: "tokyo", label: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
];

const REFRESH_MS = 5 * 60 * 1000;

function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 75) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Variable";
}

function cToF(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

async function fetchWeather(city: WeatherCity): Promise<WeatherCurrent> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`);

  const payload = (await response.json()) as {
    current?: {
      time?: string;
      temperature_2m?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
  };

  const current = payload.current;
  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("Weather response missing current conditions");
  }

  return {
    temperatureC: current.temperature_2m,
    humidity: current.relative_humidity_2m ?? 0,
    windKmh: current.wind_speed_10m ?? 0,
    condition: weatherCodeLabel(current.weather_code ?? -1),
    observedAt: current.time ?? new Date().toISOString(),
  };
}

function formatObservedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Interactive weather card — city picker, unit toggle, and live Open-Meteo data. */
export function BentoWeatherWidget() {
  const [cityId, setCityId] = useState(CITIES[0].id);
  const [unit, setUnit] = useState<"c" | "f">("f");
  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const city = CITIES.find((entry) => entry.id === cityId) ?? CITIES[0];

  const loadWeather = useCallback(async (target: WeatherCity, showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setError(null);

    try {
      const next = await fetchWeather(target);
      setWeather(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load weather");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeather(city, refreshToken === 0);
  }, [city, loadWeather, refreshToken]);

  useEffect(() => {
    const timer = setInterval(() => setRefreshToken((token) => token + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const temperature =
    weather == null
      ? "—"
      : unit === "c"
        ? `${Math.round(weather.temperatureC)}°C`
        : `${Math.round(cToF(weather.temperatureC))}°F`;

  return (
    <div className="arco-bento-card arco-bento-card--weather" data-bento-no-drag>
      <div className="arco-bento-weather__header">
        <span className="arco-bento-card__label"><T k={I18nKey.OS_BENTO_LIVE_WEATHER} /></span>
        <div className="arco-bento-weather__actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label={i18n.t(I18nKey.OS_BENTO_REFRESH_WEATHER)}
            title={i18n.t(I18nKey.COMMON$REFRESH)}
            disabled={loading}
            onClick={() => setRefreshToken((token) => token + 1)}
          >
            {"\u21BB"}
          </Button>
        </div>
      </div>

      <div className="arco-bento-weather__controls">
        <div className="arco-bento-weather__chips" role="group" aria-label={i18n.t(I18nKey.OS_BENTO_CITY)}>
          {CITIES.map((entry) => (
            <Chip key={entry.id} active={entry.id === cityId} onClick={() => setCityId(entry.id)}>
              {entry.label}
            </Chip>
          ))}
        </div>
        <div className="arco-bento-weather__chips" role="group" aria-label={i18n.t(I18nKey.OS_BENTO_TEMPERATURE_UNIT)}>
          <Chip active={unit === "c"} onClick={() => setUnit("c")}><T k={I18nKey.OS_BENTO_C} /></Chip>
          <Chip active={unit === "f"} onClick={() => setUnit("f")}><T k={I18nKey.OS_BENTO_F} /></Chip>
        </div>
      </div>

      <div className="arco-bento-weather__body">
        {loading && !weather ? (
          <p className="arco-bento-weather__status"><T k={I18nKey.COMMON$LOADING} />{city.label}…</p>
        ) : error && !weather ? (
          <div className="arco-bento-weather__status arco-bento-weather__status--error">
            <p>{error}</p>
            <Button variant="primary" onClick={() => setRefreshToken((token) => token + 1)}><T k={I18nKey.COMMON$RETRY} /></Button>
          </div>
        ) : (
          <>
            <div className="arco-bento-weather__main">
              <strong className="arco-bento-weather__temp">{temperature}</strong>
              <span className="arco-bento-weather__condition">{weather?.condition ?? "—"}</span>
            </div>
            <dl className="arco-bento-weather__stats">
              <div>
                <dt><T k={I18nKey.OS_BENTO_HUMIDITY} /></dt>
                <dd>{weather ? `${Math.round(weather.humidity)}%` : "—"}</dd>
              </div>
              <div>
                <dt><T k={I18nKey.OS_BENTO_WIND} /></dt>
                <dd>{weather ? `${Math.round(weather.windKmh)} km/h` : "—"}</dd>
              </div>
              <div>
                <dt><T k={I18nKey.OS_BENTO_UPDATED} /></dt>
                <dd>{weather ? formatObservedAt(weather.observedAt) : "—"}</dd>
              </div>
            </dl>
            {error ? <p className="arco-bento-weather__hint arco-bento-weather__hint--error">{error}</p> : null}
            <p className="arco-bento-weather__hint"><T k={I18nKey.OS_BENTO_OPEN_METEO_AUTO_REFRESH_EVERY_5_MIN} /></p>
          </>
        )}
      </div>
    </div>
  );
}
