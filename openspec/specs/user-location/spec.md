# user-location Specification

## Purpose

Obtains the user's current geographic coordinates from the browser with explicit permission handling and exposes them to the weather-fetch capability.

## Requirements

### Requirement: App requests permission to access the user's location

The browser permission request MUST be triggered by an explicit user action (a button click) and MUST NOT happen automatically on page load.

#### Scenario: User clicks location request button

- **WHEN** the user clicks the "Detect my location" button
- **THEN** the browser shows a permission dialog asking to access the user's location

### Requirement: Browser geolocation permission is supported

When the browser supports the Geolocation API, the app MUST use `navigator.geolocation.getCurrentPosition` to obtain coordinates.

#### Scenario: Geolocation API is supported

- **WHEN** the app runs in a browser that supports the Geolocation API
- **THEN** the app uses `navigator.geolocation.getCurrentPosition` to obtain latitude and longitude

### Requirement: Location permission is granted

When the user grants permission, the app MUST receive and store the latitude and longitude.

#### Scenario: Permission granted with valid coordinates

- **WHEN** the user grants location permission
- **THEN** the app stores the returned latitude and longitude and makes them available to the weather-fetch capability

#### Scenario: Permission granted but coordinates unavailable

- **WHEN** the user grants permission but no coordinates are returned
- **THEN** the app shows an error and offers to retry

### Requirement: Location permission is denied

When the user denies the permission request, the app MUST handle it gracefully with a clear message and a retry option.

#### Scenario: Permission denied

- **WHEN** the user denies the location permission
- **THEN** the app displays a user-friendly message explaining that location access was denied and offers a retry button

#### Scenario: Permission denied and user retries

- **WHEN** the user clicks retry after a denied permission
- **THEN** the browser permission dialog is shown again

### Requirement: Geolocation API is unsupported

When the browser does not support the Geolocation API, the app MUST show an appropriate message.

#### Scenario: Geolocation API unsupported

- **WHEN** the app runs in a browser without Geolocation API support
- **THEN** the app displays a message stating that geolocation is not supported in this browser

### Requirement: Geolocation errors are handled

The app MUST handle geolocation errors (timeout, position unavailable, or other errors) without crashing.

#### Scenario: Geolocation timeout

- **WHEN** the geolocation request times out
- **THEN** the app shows a message stating the request timed out and offers to retry

#### Scenario: Position unavailable

- **WHEN** the geolocation request fails because the position is unavailable
- **THEN** the app shows an error message and offers to retry

### Requirement: Location accuracy is reported

When coordinates are obtained, the app MUST make the accuracy of the position available to consumers of the location data.

#### Scenario: Accuracy reported

- **WHEN** coordinates are obtained
- **THEN** the accuracy (in meters) of the position is available alongside latitude and longitude

### Requirement: Location state is accessible to other capabilities

Once coordinates are obtained and stored, other capabilities (e.g., weather-fetch) MUST be able to use them for API requests.

#### Scenario: Weather capability uses stored location

- **WHEN** the location has been obtained successfully
- **THEN** the weather-fetch capability can read latitude and longitude to build the API request
