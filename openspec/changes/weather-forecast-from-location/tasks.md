# Tasks

## 1. Scaffold the React app

- [x] 1.1 Create a new Vite + React + TypeScript project at the workspace root (`npm create vite@latest . --template react-ts` or equivalent) and verify `package.json`, `vite.config.ts`, `index.html`, and `src/` exist
- [x] 1.2 Verify the app builds and runs: `npm install` succeeds and `npm run dev` starts without errors; confirm `npm run build` passes

## 2. Implement the geolocation capability (`user-location` spec)

- [x] 2.1 Create `src/hooks/useGeolocation.ts` exposing `isSupported`, `isLoading`, `latitude`, `longitude`, `accuracy`, `error`, and `requestLocation()`
- [x] 2.2 Implement `navigator.geolocation.getCurrentPosition` with a user-action trigger (`enableHighAccuracy: false`, short `timeout`) and verify the hook returns correct coordinates when permission is granted
- [x] 2.3 Handle "permission denied" and "retry": verify clicking the location button re-shows the browser permission dialog
- [x] 2.4 Handle "API unsupported" and verify the UI shows a browser-unsupported message when the Geolocation API is absent
- [x] 2.5 Handle error states (timeout, position unavailable) with retry and verify no crash occurs when the request errors

## 3. Implement the weather-fetch capability (`weather-fetch` spec)

- [x] 3.1 Create `src/services/weatherClient.ts` with `fetchForecast(latitude, longitude)` using native `fetch` against `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&interval=1hour`
- [x] 3.2 Create a WMO weather-code lookup table that decodes numeric codes into human-readable condition text
- [x] 3.3 Normalize the API response into `{ temperature, condition, windSpeed, code, loading, error }` and verify parsing succeeds against a sample response
- [x] 3.4 Handle HTTP errors: verify a 400 shows "invalid coordinates" error UI and a 500 shows "service unavailable"
- [x] 3.5 Handle network failures (timeout, offline) and verify a no-internet message appears with retry available
- [x] 3.6 Cancel or guard against updates from aborted requests (e.g., user navigates or retries while pending)
- [ ] 3.7 Implement BigDataCloud reverse geocoding for the obtained coordinates and display the resolved place name with the current temperature and condition; if lookup fails, keep the forecast visible and show “Location name unavailable” with the coordinates

## 4. Build the UI and wire capabilities together

- [x] 4.1 Create `src/App.tsx` that orchestrates: request location → fetch weather → render LocationRequest / Loading / Error / Weather panels
- [x] 4.2 Render a "Detect my location" button that triggers permission request on click (not on page load)
- [x] 4.3 Render a loading state while the weather request is in flight
- [x] 4.4 Render current weather: temperature, decoded condition, and wind speed when data is available
- [x] 4.5 Add CSS Modules styling for layout and readable error/loading messages
- [x] 4.6 Verify the app displays correct weather for a hardcoded coordinate pair (e.g., latitude -23.55, longitude -46.63) without requesting permission

## 5. Verification and cleanup

- [ ] 5.1 Run `npm run build` successfully and confirm no type errors
- [ ] 5.2 Manually test the full user flow in the browser: deny permission → retry → grant → view weather, and verify each state renders correctly
- [ ] 5.3 Clean up any leftover debug `console.log` statements
- [ ] 5.4 Commit scaffolding plus implementation to git

## Workflow follow-up

- Review the change artifacts (`proposal.md`, `specs/`, `design.md`, `tasks.md`) with the project.
- Archive the change after review requirements are satisfied.
- Verify the archived result.
