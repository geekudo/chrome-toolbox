# Ctrl+Enter Sender Extension

This Chrome extension forces Ctrl+Enter to send messages on ChatGPT, Gemini, and Google Chat. Normal Enter remains a newline.

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `extension/` folder in this repo.

## Usage

- `Enter`: newline
- `Ctrl + Enter`: send
- macOS: `Ctrl + Enter`

## Settings

Use the extension popup to enable or disable the feature per site. Changes apply immediately.
The Gemini Gem search toggle is also available in the popup.

## Scope

The content scripts only run on:

- `https://chat.openai.com/*`
- `https://chatgpt.com/*`
- `https://gemini.google.com/*`
- `https://chat.google.com/*`
