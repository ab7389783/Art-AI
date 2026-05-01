# Art AI

![Art AI Logo](./icon.svg)

A lightweight Vite + React app for AI-assisted art creation with a BYOK (Bring Your Own Key) Gemini integration.

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Run locally

```bash
npm run dev
```

Open `http://localhost:3000` and enter your Gemini API key in the app settings.

## How it works

- No API key is stored in source code
- API key is entered through the UI and kept locally in browser storage
- This app uses a Gemini key you bring yourself

## Build

```bash
npm run build
```

## Deployment

This repo deploys automatically from `main` to the root folder via GitHub Actions.

Set GitHub Pages source to:
- Branch: `main`
- Folder: `/(root)`

## Usage policy

**Personal/non-commercial use only.**

Commercial use, resale, and paid redistribution are prohibited without written permission.

## Notes

- Keep your Gemini API key private
- The app only works with a valid Gemini key provided through the UI

2. Start the app locally:
   ```bash
   npm run dev
   ```

3. Open the local app in your browser at `http://localhost:3000`

4. Set up your API key through the in-app settings (see API Key Setup section above)

## Build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

## GitHub Pages deployment

This repository is configured to deploy the built app automatically on every push to `main` using GitHub Actions.

The workflow builds the app and publishes the built files to the `docs` folder in the `main` branch.

### GitHub Pages Setup

1. Go to your repository Settings → Pages
2. Set Source to "Deploy from a branch"
3. Set Branch to "main" and Folder to "/docs"
4. Save the settings

Your app will be available at `https://[username].github.io/Art-AI/`

## License and Legal Notice

### Commercial Use Restriction

**This software and its associated code are strictly for personal, non-commercial use only.**

Any commercial use, including but not limited to:
- Selling, licensing, or distributing this software for profit
- Using this software in commercial products or services
- Offering this software as part of paid services
- Using this software in business operations

**Is expressly prohibited without explicit written permission from the copyright holder.**

### Copyright Notice

Copyright © 2026 [Your Name/Organization]. All rights reserved.

This project is licensed under a proprietary license. See the LICENSE file for details (if applicable).

### Disclaimer

This software is provided "as is" without warranty of any kind, either express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement.

The authors and copyright holders shall not be liable for any claim, damages, or other liability arising from the use of this software.

### Third-Party Services

This application integrates with Google's Gemini AI API. By using this application, you agree to Google's Terms of Service and Privacy Policy for the Gemini API. You are solely responsible for compliance with Google's terms and any associated costs.

## Notes

- The application requires a valid Gemini API key to function
- API keys are stored locally in your browser's local storage
- No user data is collected or transmitted to external servers except for API calls to Google's Gemini service
- Keep your API key secure and rotate it regularly for security
