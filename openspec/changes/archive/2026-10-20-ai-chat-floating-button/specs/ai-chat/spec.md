# Spec Delta

## Purpose

Provides an accessible, always-available floating help chat that opens from a floating action button and shows an initial mock question-and-answer exchange.

## ADDED Requirements

### Requirement: Chat is opened via a floating action button

The app SHALL display a floating action button (FAB) in the bottom-right area of the viewport that, when activated, opens the chat interface. The FAB SHALL remain visible at all times and SHALL not block or modify the weather forecast card.

#### Scenario: FAB is visible on the page
- **WHEN** the app loads
- **THEN** a floating action button is visible in the bottom-right area of the viewport

#### Scenario: FAB does not interfere with the weather card
- **WHEN** the weather forecast card is displayed
- **THEN** the chat FAB remains visible beside/below the card without covering it

### Requirement: Chat opens when the FAB is clicked

The chat interface SHALL open on FAB activation, covering part of the page content, and SHALL provide a clear way to close it.

#### Scenario: Chat opens on FAB click
- **WHEN** the user clicks the floating action button
- **THEN** the chat interface opens, overlaying part of the page

#### Scenario: Chat closes via close button
- **WHEN** the user clicks the close button inside the chat
- **THEN** the chat interface closes and the FAB becomes the only visible entry point again

#### Scenario: Chat closes with Escape
- **WHEN** the chat is open and the user presses Escape
- **THEN** the chat interface closes

### Requirement: Chat displays one mock question and one mock answer

The chat SHALL render an initial mock conversation consisting of exactly one user-side question and one assistant-side answer, visible immediately when the chat opens.

#### Scenario: Mock conversation displays
- **WHEN** the chat opens
- **THEN** one question and one answer are displayed inside the chat thread

### Requirement: Chat is accessible

The chat SHALL manage focus appropriately while open, be operable via keyboard, and be dismissible without blocking screen readers.

#### Scenario: Keyboard access to close the chat
- **WHEN** the chat is open and focus is inside it
- **THEN** the user can move focus to and activate the close control with the keyboard (e.g., Tab and Enter/Space)

#### Scenario: Screen reader is not blocked
- **WHEN** the chat is open
- **THEN** the rest of the page remains discoverable by assistive technology (e.g., the weather card retains its existing labels)

### Requirement: Chat is responsive

The chat interface SHALL adapt to small viewports and SHALL remain usable on mobile devices.

#### Scenario: Chat is usable on mobile
- **WHEN** the viewport is narrow (mobile size)
- **THEN** the chat remains open and readable without being cut off by the screen edges

### Requirement: Chat does not affect existing behavior

Opening, closing, or interacting with the chat SHALL NOT change the behavior or displayed data of the location or weather features.

#### Scenario: Weather data unchanged by chat interaction
- **WHEN** the user opens and closes the chat while weather data is displayed
- **THEN** the weather data, loading state, and error state are unchanged
