# Spec Delta

## Purpose

Provides an always-available floating help chat that opens from a floating action button as a docked support widget anchored above that button, and answers the user's messages with the Google Gemini API using the caller's current weather and place context. The assistant is restricted to weather and meteorology: any other subject is declined with a fixed message.

## ADDED Requirements

### Requirement: Chat is restricted to weather and meteorology

The chat SHALL answer only questions about weather and meteorology — the current conditions at the caller's location (condition, temperature, wind speed) and weather-related questions in general. The chat SHALL decline any other subject.

#### Scenario: Weather question about the current location is answered
- **WHEN** the user asks about the current conditions at their location
- **THEN** the assistant answers the question using the weather and place context provided by the app

#### Scenario: General meteorology question is answered
- **WHEN** the user asks a weather-related question that is not about the caller's current conditions
- **THEN** the assistant answers it, without being declined

#### Scenario: Out-of-scope question is declined
- **WHEN** the user asks about a subject unrelated to weather or meteorology
- **THEN** the assistant declines and does not answer the question

### Requirement: Out-of-scope messages receive a fixed decline message

When the chat declines a message, the reply SHALL be exactly the text `Posso apenas informar sobre o clima de um determinado lugar`. The chat SHALL NOT append an explanation, an apology, an offer to help with something else, or any other text to the decline.

#### Scenario: Decline message is exact
- **WHEN** the user sends a message that is declined
- **THEN** the assistant's reply is exactly `Posso apenas informar sobre o clima de um determinado lugar`

#### Scenario: Decline carries no extra text
- **WHEN** the user sends a message that is declined
- **THEN** the reply contains no additional explanation, apology, or follow-up offer

#### Scenario: Repeated decline is identical
- **WHEN** the user sends several out-of-scope messages in the same conversation
- **THEN** each decline is the same fixed text

#### Scenario: The declined question remains visible in the thread
- **WHEN** the user sends a message that is declined
- **THEN** the user's own message is still shown in the thread alongside the decline

### Requirement: Out-of-scope messages are declined without calling the model

The chat SHALL determine that a message is out of scope BEFORE contacting the Gemini API. An out-of-scope message SHALL NOT trigger a model request, SHALL NOT consume API quota, and SHALL NOT display the pending indicator.

#### Scenario: No request is made for an out-of-scope message
- **WHEN** the user sends a message that is declined
- **THEN** no request to the Gemini API is made and the pending indicator is not shown

#### Scenario: The decline is answered immediately
- **WHEN** the user sends a message that is declined
- **THEN** the decline message appears in the thread without waiting for a network round trip

### Requirement: Scope classification defaults to declining

The chat's scope check SHALL be default-deny: a message SHALL be treated as in scope only when it is recognizably about weather, or when it continues a conversation already about weather. A message that carries no weather vocabulary and does not continue a weather conversation SHALL be declined.

#### Scenario: Message with no weather vocabulary is declined
- **WHEN** the user sends a message that contains no weather-related vocabulary and does not continue a weather conversation
- **THEN** the message is declined

#### Scenario: Follow-up on a weather question is answered
- **WHEN** the user asks a weather question and then sends a follow-up message without repeating weather vocabulary
- **THEN** the follow-up is treated as in scope and answered

#### Scenario: Weather vocabulary is enough on its own
- **WHEN** the user sends a message containing weather-related vocabulary
- **THEN** the message is treated as in scope without requiring prior weather conversation

### Requirement: The model is instructed to stay within scope

The system instruction sent to the model SHALL declare that the assistant only answers questions about weather and meteorology, and SHALL instruct the model to decline any other subject. This instruction SHALL be sent in addition to the local scope check, acting as a defense for messages the local check lets through.

#### Scenario: System instruction declares the scope
- **WHEN** the user sends an in-scope message
- **THEN** the request's system instruction states the weather-only scope and tells the model to decline other subjects

#### Scenario: Model declines an out-of-scope message that reached it
- **WHEN** a message the local check let through turns out to be out of scope, and the model declines
- **THEN** the reply rendered to the user is the fixed decline message

### Requirement: The opening message states the scope

The chat's opening message SHALL tell the user that the assistant answers questions about weather, and SHALL NOT offer help on subjects outside the weather scope.

#### Scenario: Opening message states the scope
- **WHEN** the user opens the chat
- **THEN** the opening message states that the assistant answers questions about weather

#### Scenario: Opening message makes no out-of-scope offer
- **WHEN** the user opens the chat
- **THEN** the opening message does not offer help on subjects outside the weather scope

### Requirement: Declining does not break the conversation

A declined message SHALL NOT put the chat into an error state. The chat SHALL remain usable, the input SHALL remain enabled, and the user SHALL be able to send another message after a decline.

#### Scenario: Chat remains usable after a decline
- **WHEN** the user sends a message that is declined
- **THEN** the input is enabled, the chat accepts a new message, and no error is shown

#### Scenario: Weather data is unaffected by a decline
- **WHEN** the user sends a message that is declined
- **THEN** the weather forecast and the rest of the page continue to work normally

## MODIFIED Requirements

### Requirement: Chat is given the current weather and place context

The chat SHALL receive the current place name, weather condition, temperature, and wind speed from the app, and SHALL include the available values in the system instruction sent to the model, so the assistant can answer questions about the forecast shown on screen. The system instruction SHALL also carry the weather-only scope declared by the chat's scope policy.

#### Scenario: Context is included in the request
- **WHEN** the user sends an in-scope message and the app has current weather data
- **THEN** the request's system instruction contains the available place name, condition, temperature, and wind speed

#### Scenario: Context is omitted when weather data is unavailable
- **WHEN** the user sends an in-scope message and the app has no current weather data
- **THEN** the request is still sent, with the unavailable values omitted from the system instruction

#### Scenario: Scope is stated alongside the context
- **WHEN** the user sends an in-scope message
- **THEN** the request's system instruction states the weather-only scope

### Requirement: Chat answers messages using the Google Gemini API

The chat SHALL obtain its replies to in-scope messages from the Google Gemini API using the `@google/genai` SDK, and SHALL render the model's text reply in the message history as an assistant message. Messages the chat declines before contacting the model are exempt from this requirement, as specified by the out-of-scope requirements.

#### Scenario: Assistant reply is rendered
- **WHEN** the Gemini API returns a successful response containing text
- **THEN** the text is appended to the history as an assistant message

#### Scenario: Prior conversation is sent as context
- **WHEN** the user sends an in-scope message and earlier messages exist in the history
- **THEN** the request includes the earlier messages, so the model can refer back to them

#### Scenario: The SDK used is the currently maintained one
- **WHEN** the Gemini integration is implemented
- **THEN** it uses the `@google/genai` package, not the deprecated `@google/generative-ai` package

#### Scenario: The model used is available on the free tier
- **WHEN** the Gemini integration is implemented
- **THEN** the default model is one that Google serves on the free tier without billing, and it can be overridden by configuration
