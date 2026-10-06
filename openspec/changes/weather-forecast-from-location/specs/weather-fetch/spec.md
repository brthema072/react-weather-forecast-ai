# Spec Delta

## Purpose

Fetches and normalizes current weather forecast data from the free Open-Meteo API using latitude and longitude supplied by the user-location capability.

## ADDED Requirements

### Requirement: App fetches forecast from the Open-Meteo API

The app MUST call the Open-Meteo public forecast API (`https://api.open-meteo.com/v1/forecast`) with the user's latitude and longitude as query parameters.

#### Scenario: Forecast request is sent with coordinates

- **WHEN** the location is obtained
- **THEN** the app calls `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>`

### Requirement: Forecast API response contains forecast data

The app MUST parse and display forecast data returned by the Open-Meteo API, including current temperature and weather code.

#### Scenario: Forecast data displays successfully

- **WHEN** the API returns a valid forecast response
- **THEN** the app displays the current temperature and weather condition based on the returned data

### Requirement: Current weather includes temperature, condition, and wind

The displayed current weather MUST include at least the current temperature, the weather condition derived from the weather code, and wind speed.

#### Scenario: All weather fields display

- **WHEN** a valid forecast is received
- **THEN** the app shows current temperature, weather condition, and wind speed

### Requirement: App handles a 400 response from the API

When the Open-Meteo API returns a 400 (Bad Request) response, the app MUST not crash and MUST inform the user.

#### Scenario: API returns invalid coordinates

- **WHEN** the API responds with status 400
- **THEN** the app displays an error message (e.g., the coordinates could not be used) and offers to retry

### Requirement: App handles a 500 response from the API

When the Open-Meteo API returns a 500 (Internal Server Error) response, the app MUST not crash and MUST inform the user.

#### Scenario: API returns server error

- **WHEN** the API responds with status 500
- **THEN** the app displays a message indicating the service is temporarily unavailable and offers to retry

### Requirement: App handles network and other errors

Network failures and other errors MUST be handled gracefully without crashing, with a user-facing error message and a retry option.

#### Scenario: Network error

- **WHEN** the API request fails due to a network error (timeout or offline)
- **THEN** the app displays a message indicating no internet connection and offers to retry

#### Scenario: Request aborted

- **WHEN** the API request is aborted (e.g., user navigates away)
- **THEN** the app does not update state from the aborted response and does not crash

### Requirement: Loading state while fetching

While the forecast is being fetched, the app MUST show a loading state.

#### Scenario: Loading state shown

- **WHEN** a forecast request is in progress
- **THEN** the app displays a loading indicator instead of weather data

### Requirement: Weather condition codes are decoded

Weather codes returned by Open-Meteo MUST be translated into human-readable condition text (and/or an emoji) for display.

#### Scenario: Weather code decoded

- **WHEN** the response contains a weather code
- **THEN** the app displays a human-readable weather condition instead of the raw numeric code

## REMOVED Requirements

N/A — greenfield project; no existing requirements to remove.
