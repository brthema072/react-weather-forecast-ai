# Proposal

## Why

We need a lightweight React weather app that displays the current weather forecast at the user's current location. The app will use the free [Open-Meteo API](https://open-meteo.com), requesting browser permission to access the user's geolocation before fetching forecast data. This is a learning/proof-of-concept project for the `react-wheather-forecast-react-ai` workspace.

## What Changes

- Create a new React application (Vite + React + TypeScript) as the project root.
- Add a browser geolocation request (with permission handling) to obtain the user's latitude/longitude.
- Fetch and display the current weather forecast from the Open-Meteo free API using the obtained coordinates.
- Show loading, error, and success states with clear user feedback when permission is denied or the API fails.
- Write OpenSpec planning artifacts: proposal, capability specs (`user-location`, `weather-fetch`), design, and implementation tasks.

## Capabilities

### New Capabilities

- `user-location`: Requests and holds the user's geolocation with explicit browser permission handling (granted / denied / unsupported / error), exposing the coordinates to the rest of the app.
- `weather-fetch`: Retrieves the current weather forecast from the Open-Meteo API given latitude and longitude, with API-key-free usage, response normalization, and error handling.

### Modified Capabilities

- None — this is a greenfield project; no existing capability specs exist.

## Impact

- **New code**: React components (`App`, `Weather`, `LocationStatus`), a geolocation hook (`useGeolocation`), an API client module (`weatherClient`), and a Vite entry point.
- **Dependencies**: `react`, `react-dom`, `@vitejs/plugin-react` (no heavy 3rd-party libs; fetch is native).
- **External systems**: Open-Meteo public forecast API (https://api.open-meteo.com/v1/forecast); browser Geolocation API.
