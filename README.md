# Art AI

A Vite + React application for interactive AI-assisted art creation, asset management, and visual simulation.

## Features

- Modern React UI with viewport, control panel, gallery, logs, and settings
- Gemini API integration for AI-driven asset generation
- Gallery management and asset uploads
- Toast notifications, logs overlay, and responsive canvas layout
- GitHub Pages deployment via GitHub Actions

## API Key Setup (BYOK - Bring Your Own Key)

This application uses Google's Gemini AI API. You must provide your own API key to use the application.

### How to get a Gemini API key:

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key or use an existing one
4. Copy the API key

### How to use the API key in the application:

1. Open the application in your browser
2. Click the settings icon (⚙️) in the top-right corner
3. Go to the "API Settings" section
4. Enter your Gemini API key in the input field
5. Click "Save" to store the key securely in your browser's local storage

**Important Notes:**
- Your API key is stored locally in your browser and never sent to our servers
- The API key is required for all AI-powered features to work
- Keep your API key secure and do not share it with others
- You are responsible for any usage costs associated with your API key

## Local development

### Prerequisites

- Node.js 18+ or 20+

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

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
