# Spec Delta

## Purpose

Provides an always-available floating help chat that opens from a floating action button as a docked support widget anchored above that button, and answers the user's messages with the Google Gemini API using the caller's current weather and place context.

## MODIFIED Requirements

### Requirement: Chat is opened via a floating action button

The app SHALL display a floating action button (FAB) in the bottom-right area of the viewport that, when activated, opens the chat interface. The FAB SHALL remain visible at all times and SHALL not block or modify the weather forecast card.

#### Scenario: FAB is visible on the page
- **WHEN** the app loads
- **THEN** a floating action button is visible in the bottom-right area of the viewport

#### Scenario: FAB does not interfere with the weather card
- **WHEN** the weather forecast card is displayed
- **THEN** the chat FAB remains visible beside/below the card without covering it

### Requirement: Chat opens when the FAB is clicked

The chat interface SHALL open on FAB activation as a panel docked above the FAB, and SHALL provide a clear way to close it.

#### Scenario: Chat opens on FAB click
- **WHEN** the user clicks the floating action button
- **THEN** the chat interface opens as a panel anchored above the FAB in the bottom-right area of the viewport

#### Scenario: Chat closes via close button
- **WHEN** the user clicks the close button inside the chat
- **THEN** the chat interface closes and the FAB becomes the only visible entry point again

#### Scenario: Chat closes with Escape
- **WHEN** the chat is open and the user presses Escape
- **THEN** the chat interface closes

### Requirement: Chat is accessible

The chat SHALL manage focus appropriately while open, be operable via keyboard, and be dismissible without blocking screen readers.

#### Scenario: Keyboard access to close the chat
- **WHEN** the chat is open and focus is inside it
- **THEN** the user can move focus to and activate the close control with the keyboard (e.g., Tab and Enter/Space)

#### Scenario: Screen reader is not blocked
- **WHEN** the chat is open
- **THEN** the rest of the page remains discoverable by assistive technology (e.g., the weather card retains its existing labels)

#### Scenario: Screen reader announces the incoming message
- **WHEN** a message is added to the thread, including the assistant's reply
- **THEN** the thread region announces the new content to assistive technology

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

## ADDED Requirements

### Requirement: Chat is docked above the FAB instead of centered

The chat SHALL render as a fixed-position panel anchored in the bottom-right area of the viewport, directly above the floating action button. It SHALL NOT render a modal overlay, SHALL NOT dim or obscure the page behind it, and SHALL NOT prevent the page from scrolling.

#### Scenario: Chat is anchored above the FAB
- **WHEN** the chat is open
- **THEN** the panel is positioned in the bottom-right area of the viewport, above the floating action button, with a visible gap between them

#### Scenario: Page content stays visible and scrollable
- **WHEN** the chat is open
- **THEN** the weather forecast behind the chat remains visible and undimmed, and the page can still be scrolled

#### Scenario: Chat is anchored to the viewport, not the document
- **WHEN** the page is scrolled while the chat is open
- **THEN** the panel stays in the same position relative to the viewport

### Requirement: Chat panel has header, thread, and footer regions

The chat SHALL be composed of three regions: a header containing the chat title and the close control, a scrollable message history region, and a footer containing the message input and the send control.

#### Scenario: Panel structure is present
- **WHEN** the chat is open
- **THEN** a header with a title and close control, a message history region, and a footer with an input and a send control are all rendered

### Requirement: Message history scrolls to the latest message

The message history region SHALL scroll to reveal the most recently added message whenever a message is added, and SHALL NOT auto-scroll while the user is reading older messages further up the history.

#### Scenario: New message becomes visible
- **WHEN** a message is added to the history
- **THEN** the history scrolls so that the new message is visible

#### Scenario: Auto-scroll is suspended while reading history
- **WHEN** the user has scrolled up to read an earlier message and a new message arrives
- **THEN** the history does not jump to the bottom and the user's reading position is preserved

### Requirement: User can send a message

The chat SHALL accept a text message typed into the footer input and SHALL append it to the message history as a user message when the user activates the send control or presses the `Enter` key.

#### Scenario: Message sent via the send control
- **WHEN** the user types text into the input and clicks the send control
- **THEN** the text is appended to the history as a user message and the input is cleared

#### Scenario: Message sent via the Enter key
- **WHEN** the user types text into the input and presses `Enter`
- **THEN** the text is appended to the history as a user message and the input is cleared

#### Scenario: Empty messages are not sent
- **WHEN** the input contains only whitespace and the user attempts to send
- **THEN** no message is appended to the history

#### Scenario: Enter does not insert a newline
- **WHEN** the user presses `Enter` in the input
- **THEN** no newline is inserted into the input

### Requirement: Chat shows a pending indicator while awaiting a reply

While a request to the LLM is in flight, the chat SHALL display a visual "typing" indicator, SHALL prevent the user from submitting a second message, and SHALL disable the message input.

#### Scenario: Typing indicator is shown
- **WHEN** a user message is sent and no reply has arrived yet
- **THEN** a typing indicator is visible in the message history and the input is disabled

#### Scenario: Input is re-enabled after the reply
- **WHEN** the assistant's reply arrives, or the request fails
- **THEN** the typing indicator is removed and the input is enabled again

### Requirement: Chat answers messages using the Google Gemini API

The chat SHALL obtain its replies from the Google Gemini API using the `@google/genai` SDK, and SHALL render the model's text reply in the message history as an assistant message.

#### Scenario: Assistant reply is rendered
- **WHEN** the Gemini API returns a successful response containing text
- **THEN** the text is appended to the history as an assistant message

#### Scenario: Prior conversation is sent as context
- **WHEN** the user sends a message and earlier messages exist in the history
- **THEN** the request includes the earlier messages, so the model can refer back to them

#### Scenario: The SDK used is the currently maintained one
- **WHEN** the Gemini integration is implemented
- **THEN** it uses the `@google/genai` package, not the deprecated `@google/generative-ai` package

#### Scenario: The model used is available on the free tier
- **WHEN** the Gemini integration is implemented
- **THEN** the default model is one that Google serves on the free tier without billing, and it can be overridden by configuration

### Requirement: Chat is given the current weather and place context

The chat SHALL receive the current place name, weather condition, temperature, and wind speed from the app, and SHALL include the available values in the system instruction sent to the model, so the assistant can answer questions about the forecast shown on screen.

#### Scenario: Context is included in the request
- **WHEN** the user sends a message and the app has current weather data
- **THEN** the request's system instruction contains the available place name, condition, temperature, and wind speed

#### Scenario: Context is omitted when weather data is unavailable
- **WHEN** the user sends a message and the app has no current weather data
- **THEN** the request is still sent, with the unavailable values omitted from the system instruction

### Requirement: Chat reports API failures to the user

When the Gemini API request fails, the chat SHALL show a user-facing error message in the message history, SHALL NOT crash the app, and SHALL allow the user to try again.

#### Scenario: API request fails
- **WHEN** the Gemini API request fails or returns no usable text
- **THEN** an error message is shown in the message history, the chat remains usable, and the input is re-enabled

#### Scenario: Rate limit is reported distinctly
- **WHEN** the Gemini API responds with HTTP 429
- **THEN** the error message indicates that the request limit was reached, rather than showing a generic failure

#### Scenario: App is unaffected by an API failure
- **WHEN** the Gemini API request fails
- **THEN** the weather forecast, the FAB, and the rest of the page continue to work normally

### Requirement: Missing API key is handled without breaking the page

The chat SHALL read the Gemini API key from configuration and SHALL NOT expose the key in the user interface. When no key is configured, the chat SHALL render a configuration notice in place of the message input, SHALL NOT attempt to call the Gemini API, and SHALL leave the rest of the page functional.

#### Scenario: Missing key shows a configuration notice
- **WHEN** the app runs without a configured API key and the user opens the chat
- **THEN** a notice explaining that the API key is not configured is shown in place of the input, and no API request is attempted

#### Scenario: The key is not displayed
- **WHEN** the chat is open
- **THEN** the API key value never appears in the rendered output

#### Scenario: The key is not committed to the repository
- **WHEN** environment files are tracked by git
- **THEN** local `.env` files holding the key are excluded from version control

## REMOVED Requirements

### Requirement: Chat displays one mock question and one mock answer

**Reason**: The mock conversation is replaced by a real Gemini-backed exchange. The chat no longer ships a fixed question-and-answer pair; its opening content is a welcome message, and subsequent messages come from the user and the model.

**Migration**: The welcome message that opens the thread takes the place of the mock exchange. No user-facing data is migrated, since the mock conversation was never persisted.

