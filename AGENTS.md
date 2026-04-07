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

## cmux Usage Guide for Agents
`cmux` is a powerful tool for visual and functional verification of your changes in a real browser environment.

### Basic Commands
- **Open Browser:** `cmux browser open <url>`
- **Navigate:** `cmux browser --surface <surface_id> navigate <url>`
- **Reload:** `cmux browser --surface <surface_id> reload`
- **Wait for Load:** `cmux browser --surface <surface_id> wait --load-state complete`
- **Take Snapshot:** `cmux browser --surface <surface_id> snapshot` (Visual verification of text/elements)
- **Check Console Logs:** `cmux browser --surface <surface_id> console list`
- **Check Errors:** `cmux browser --surface <surface_id> errors list`
- **Interact:** `cmux browser --surface <surface_id> click <selector>` or `fill <selector> <text>`
- **Get Page Content:** `cmux browser --surface <surface_id> get html body` (Useful for deep inspection)

### Common Surface IDs
When you open a new browser, the output will provide the `surface_id` (e.g., `surface:3`). Use this ID in subsequent commands to target the correct browser tab.

## Important Constraints for Agents
1. **Responsive Design:** Use `Platform.OS` or `Dimensions` for platform-specific adjustments.
2. **Safe Areas:** Always use `SafeAreaView` (from `react-native`) for proper layout on modern mobile devices.
3. **Icons:** Prefer `@expo/vector-icons` if adding icons.
4. **Testing:** Before submitting changes, ensure they do not break the web build by running `npx expo export --platform web`. ALWAYS TEST CHANGES BY LOADING THE PAGE IN A WEB BROWSER AND INSPECTING IT with cmux's browser. Use `cmux --help` for help.
