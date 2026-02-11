# CLAUDE.md

This file provides guidance for AI assistants working on this codebase.

## Project Overview

**Train Revenue Calculator** (18xx 収益計算補助) is a Japanese-language single-page web application that helps players of the 18xx board game series calculate train revenues, manage companies, track stock holdings, and compute dividend distributions.

### Key Features
- Player and company management with batch creation
- Train route design with interactive stop editors
- Operating Round (OR) revenue tracking per company
- Stock holding percentage management per player per company
- Treasury stock tracking
- Dividend calculation and distribution display
- Summary dashboard with sorted rankings
- Persistent state via browser localStorage

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.2 (Create React App) |
| Language | JavaScript (no TypeScript) |
| Styling | Tailwind CSS 3.4 via PostCSS + Autoprefixer |
| Testing | Jest + React Testing Library (via react-scripts) |
| Deployment | GitHub Pages (gh-pages package) |
| State | React useState/useEffect hooks, no external state library |
| Persistence | Browser localStorage (key: `trainRevenue_18xx_data`) |

## Project Structure

```
train-revenue-calculator/
├── public/              # Static assets (index.html, favicon, manifest)
├── src/
│   ├── App.js           # Main application (~980 lines, all components)
│   ├── App.css          # App-level styles
│   ├── App.test.js      # Test file (placeholder, needs updating)
│   ├── index.js         # React DOM entry point (StrictMode enabled)
│   ├── index.css        # Global styles (Tailwind directives)
│   ├── setupTests.js    # Jest/RTL setup
│   ├── reportWebVitals.js
│   └── logo.svg
├── package.json
├── tailwind.config.js   # Tailwind config (scans src/**/*.{js,jsx,ts,tsx})
├── postcss.config.js    # PostCSS config (tailwindcss + autoprefixer)
└── .gitignore
```

## Commands

```bash
npm start        # Dev server on localhost:3000
npm test         # Jest in watch mode
npm run build    # Production build to /build
npm run deploy   # Build + deploy to GitHub Pages
```

## Architecture

### Single-File Component Structure

All components live in `src/App.js`. The component hierarchy is:

```
App (main state, handlers, localStorage sync)
├── Modal (confirmation/info dialogs)
├── NavButton (tab navigation)
├── SummaryView (dashboard with player dividends + company revenues)
├── ManagementView (CRUD for players/companies, game settings)
│   └── Modal (inline player name editing)
└── CompanyDetailView (selected company operations)
    ├── TrainCard (per-train route editor)
    │   ├── RevenueStopEditor (individual stop with inline edit)
    │   └── RevenueInput (add new stops with preset/custom values)
    └── PercentageInputControl (stock % input with +/- buttons)
```

### State Management

- All state lives in the `App` component via `useState` hooks
- State auto-saves to localStorage on every change via `useEffect`
- View routing is manual via `currentView` state (`'summary'` | `'management'` | `'companyDetail'`)
- No React Router, Redux, or Context API

### Data Model

```javascript
// Player
{ id: string (UUID), name: string }

// Company
{
  id: string (UUID),
  name: string,
  trains: [{ id: string (UUID), stops: number[] }],
  stockHoldings: [{ playerId: string, percentage: number }],
  orRevenues: [{ orNum: number, revenue: number }],
  treasuryStockPercentage: number
}

// App State persisted to localStorage
{
  players: Player[],
  companies: Company[],
  selectedCompanyId: string | null,
  numORs: number (1-5),
  lastUpdated: string (ISO date)
}
```

### Deletion Patterns

Deleting entities uses a two-step confirmation via `Modal`:
1. Set `confirmAction` callback and `modalMessage`
2. Modal triggers the callback on user confirm

When a player is deleted, their stock holdings are also removed from all companies.

## Code Conventions

- **Language**: UI text is in Japanese; code identifiers are in English
- **Components**: Functional components with hooks only (no class components)
- **Styling**: Tailwind CSS utility classes exclusively (no custom CSS classes for layout/design)
- **IDs**: Generated via `crypto.randomUUID()`
- **Immutable updates**: State updates use spread operators and `map`/`filter` (no direct mutation)
- **Event handlers**: Named `handle*` in App, passed as props to child components
- **No prop-types or TypeScript**: No static type checking
- **Indentation**: 2 spaces

## Testing

The test file `src/App.test.js` contains a single placeholder test from the CRA template that checks for "learn react" text. This test does **not** match the current application and will fail. Tests need to be rewritten to match actual components.

Run tests: `npm test`

## Known Limitations

- **Monolithic App.js**: All components (~980 lines) are in a single file
- **No error boundaries**: React error boundaries are not implemented
- **Stale test**: The existing test does not reflect the current UI
- **No TypeScript**: Plain JavaScript without type safety
- **Props drilling**: Handlers are passed through multiple component layers
- **Japanese-only**: All UI strings are hardcoded in Japanese

## Deployment

The app deploys to GitHub Pages at `https://satamoto7.github.io/train-revenue-calculator` using:

```bash
npm run deploy   # runs "npm run build" then "gh-pages -d build"
```

The `homepage` field in `package.json` controls the base URL for asset paths.
