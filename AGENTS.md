# AGENTS.md

## Project Context
- **Name:** Buskaren
- **Nature:** React Native project utilizing [Expo](https://expo.dev/) with comprehensive Web support.
- **Goal:** Provide a high-quality, cross-platform experience (Web, iOS, Android).

## Architecture & Technology
- **React Native Web:** The UI layer is built with standard React Native primitives (`View`, `Text`, `StyleSheet`), which are translated for the web by `react-native-web`.
- **Expo SDK:** Used for platform-agnostic APIs and development tooling.
- **Language:** TypeScript (Strict).
- **Styling:** `StyleSheet.create`. Avoid Tailwind unless explicitly requested.

## Development Workflow
- **Development Server:** Use `npx expo start`.
- **Web-Specific Development:** Use `npm run web` or `npx expo start --web`.
- **Dependency Management:** Use `npx expo install` instead of `npm install` for library compatibility.

## Deployment Instructions
- **Platform:** GitHub Pages (`https://jamesyeap.github.io/bus-karen`).
- **Mechanism:** `gh-pages` package.
- **Workflow:**
  1. `npm run predeploy`: Generates a static web bundle in `dist/` using `npx expo export --platform web`.
  2. `npm run deploy`: Pushes the `dist/` contents to the `gh-pages` branch on the remote repository.

## Important Constraints for Agents
1. **Responsive Design:** Use `Platform.OS` or `Dimensions` for platform-specific adjustments.
2. **Safe Areas:** Always use `SafeAreaView` (from `react-native`) for proper layout on modern mobile devices.
3. **Icons:** Prefer `@expo/vector-icons` if adding icons.
4. **Testing:** Before submitting changes, ensure they do not break the web build by running `npx expo export --platform web`.
