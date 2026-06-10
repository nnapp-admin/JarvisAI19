# AGENTS.md

## Project overview

**Facility19 · Jarvis Command Center** (`jarvis-ai19`) is a static, browser-only 3D executive dashboard demo. There is no backend, database, or Docker stack. Mock data lives in `js/data.js`.

## Cursor Cloud specific instructions

### Services

| Service | Required? | Notes |
|---------|-----------|-------|
| Static HTTP server | **Yes** | `npm run dev` serves on **http://localhost:8765** |
| Internet / CDN | **Yes** | Three.js, GSAP, and Google Fonts load from CDNs at runtime |
| Browser (Chrome/Edge) | **Yes** | WebGL, Web Audio, and Web Speech API for the full experience |
| OpenRouter / ElevenLabs | No | Optional voice AI; app degrades to keyword routing and browser TTS without keys |

### Common commands

See `package.json` scripts:

- **Dev server:** `npm run dev` (port 8765)
- **Build (env injection):** `npm run build` — reads `.env` and writes `js/config.js` via `scripts/inject-env.js`
- **Lint / tests:** Not configured in this repo (no ESLint, Jest, or `test`/`lint` scripts)

### Environment variables

Copy `.env.example` to `.env` before `npm run build` if you need OpenRouter or ElevenLabs integration. Keys are injected into `js/config.js` at build time; without a build step the committed `js/config.js` placeholders are used.

### Gotchas

- `npm run dev` uses `npx serve`; first run may download `serve` — allow a few seconds before curling port 8765.
- Voice features need microphone permission in the browser; LLM/TTS quality depends on valid API keys in `.env`.
- `uploads/jarvis-dashboard.jsx` is an unused React prototype and is not part of the served app (`index.html`).
