# Bus Karen

Why my bus so shakeh?!

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo Go](https://expo.dev/client) app on your mobile device (optional, for mobile testing)

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:jamesyeap/bus-karen.git
   cd bus-karen
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Project

- **Web:** `npm run web` (Opens in your default browser)
- **iOS:** `npm run ios` (Requires macOS and Xcode)
- **Android:** `npm run android` (Requires Android Studio/emulator)
- **All Platforms:** `npm start` (Opens the Expo Dev Menu)

## Building & Deployment

### Web Export

To generate a production-ready static site in the `dist/` directory:

```bash
npx expo export --platform web
```

### GitHub Pages Deployment

This project is configured to deploy to [jamesyeap.github.io/bus-karen](https://jamesyeap.github.io/bus-karen).
To deploy the latest version:

```bash
npm run deploy
```

_Note: This runs `predeploy` (exporting for web) and then uses `gh-pages` to push the `dist` folder to the `gh-pages` branch._

## Tech Stack

- **Framework:** [Expo](https://expo.dev/) (SDK 54)
- **UI Library:** [React Native Web](https://necolas.github.io/react-native-web/)
- **Language:** TypeScript
- **Deployment:** GitHub Pages via `gh-pages`
