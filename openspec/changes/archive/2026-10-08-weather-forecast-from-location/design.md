# Design

## Context

- Greenfield React project: no existing code or dependencies. The workspace contains only OpenSpec scaffolding.
- No registered OpenSpec store — artifacts live repo-local under `openspec/changes/<change>/`.
- External dependency: Open-Meteo free forecast API (https://api.open-meteo.com/v1/forecast), which requires no API key.
- The app runs in a browser, so it uses the browser Geolocation API (`navigator.geolocation`) and the native `fetch` API.

## Goals / Non-Goals

**Goals:**
- A single-page React app that obtains the user's location via an explicit user action, fetches the current weather from Open-Meteo, and displays it.
- Clean separation: a geolocation concern (`useGeolocation` hook) and a weather-fetch concern (`weatherClient` module + data-normalization layer).
- Robust handling of all permission and API states: loading, success, denied, unsupported, timeout, 4xx/5xx, and network failure.
- Minimal dependencies: React + Vite only; no third-party libraries.

**Non-Goals:**
- No user accounts, preferences, or saved locations (beyond in-memory state during the session).
- No PWA features, offline caching, or service workers.
- No server/SSR — the app is a client-side Vite bundle.
- No map view or precipitation forecast detail beyond the current weather + basic forecast.

## Decisions

### 1. Project scaffold: Vite + React + TypeScript

**Decision:** Initialize with Vite's React + TypeScript template (`npm create vite@latest --template react-ts`).

**Why:** Fast, modern tooling with zero config friction, strong type checking, and the default `main.tsx` entry point matching the artifact structure below. Alternatives:
- **Create React App:** deprecated and heavier; avoided.
- **Next.js:** unnecessary server/SSR complexity for a purely client-side app; avoided.

### 2. Geolocation via `navigator.geolocation.getCurrentPosition`

**Decision:** Use the browser Geolocation API's `getCurrentPosition(success, error, options)` with a short `timeout` and `enableHighAccuracy: false`.

**Why:** The spec requires an explicit user action (button click) to trigger the request and graceful handling of denied/unsupported/error states — all of which `getCurrentPosition`'s callback/error pattern maps to cleanly. `watchPosition` is overkill for a single current-location fetch.

### 3. Feature flags via the `useGeolocation` hook

**Decision:** Encapsulate geolocation in a custom hook returning `{ latitude, longitude, accuracy, error, isSupported, isLoading, requestLocation }`.

**Why:** Keeps DOM event wiring (`onClick`) out of the UI component and gives the weather-fetch consumer a single source of truth for coordinates and permission state.

### 4. Weather data via a dedicated client module + normalization

**Decision:** A `src/services/weatherClient.ts` module exposes `fetchForecast(lat, lon)` returning a normalized shape:

```ts
{
  temperature: number | null;
  condition: string;          // human-readable text from weather code
  windSpeed: number | null;   // m/s
  code: number;               // raw Open-Meteo WMO code
  loading: boolean;
  error: string | null;
}
```

A small `weatherCode` lookup table decodes WMO codes to text (e.g., 0 → Clear sky, 61 → Rain, 95 → Thunderstorm).

**Why:** Decouples the API contract from the UI so the table can be extended later; normalizes the response once at the boundary so components stay simple. `fetch` is native — no axios dependency.

### 5. Single `App` component as the orchestrator

**Decision:** `App` reads geolocation state, calls the weather client when valid coordinates exist, and renders one of: LocationRequest, Loading, Error, or Weather panels.

**Why:** Keeps a single data-flow path (hook → client → UI) and makes error/loading states explicit and testable.

### 6. Styling: inline CSS classes (CSS Modules) with no design system yet

**Decision:** Plain CSS modules for layout; no Tailwind, no component library.

**Why:** Greenfield, minimal footprint; adds no dependency the user did not ask for.

### 7. Resolve and display a place name

**Decision:** After coordinates are obtained, use native `fetch` to call BigDataCloud's public reverse-geocoding endpoint at `https://api.bigdatacloud.net/data/reverse-geocode-client`, passing latitude, longitude, and `localityLanguage=en`. Prefer the first non-empty value in this order: `locality`, `city`, `principalSubdivision`, `countryName`. Keep this lookup independent of the Open-Meteo request so a place-name failure does not prevent the forecast from displaying.

**Why:** The forecast response does not provide a human-readable locality for the user's coordinates. BigDataCloud provides a browser-callable endpoint without an API key or another package. If no place name is available, display “Location name unavailable” and the coordinates while retaining the forecast.

## Risks / Trade-offs

- [Risk] Geolocation accuracy can be poor indoors / on desktop (GPS unavailable) → [Mitigation] Report `accuracy` alongside coordinates; accept whatever the browser returns per spec.
- [Risk] Third-party CORS across origins → [Mitigation] Open-Meteo exposes public CORS headers for `api.open-meteo.com`, so a direct browser `fetch` works; no proxy needed.
- [Risk] Reverse geocoding sends the user's coordinates to BigDataCloud → [Mitigation] Disclose the external request in the UI/project behavior; do not store the coordinates or resolved place name.
- [Risk] Reverse geocoding may fail or return no locality → [Mitigation] Keep the weather forecast visible and show an explicit unavailable label with the coordinates.
- [Risk] `getCurrentPosition` may hang if the permission dialog is never answered → [Mitigation] Set a short `options.timeout` and handle the error callback as "timed out", with retry.
- [Risk] Network requests for stale coordinates if the app reloads → [Mitigation] State is session-only (in-memory); acceptable for a demo app per non-goals.

## Migration Plan

Greenfield — no migration or rollback. Implementation steps are in `tasks.md`; run `npm install && npm run dev` to verify locally.

## Open Questions

None that block implementation.
