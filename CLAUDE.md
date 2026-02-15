# CLAUDE.md

This file provides guidance for AI assistants working on this codebase.

## Project Overview

**Train Revenue Calculator** (18xx 収益計算補助) is a Japanese-language single-page web application that helps players of the 18xx board game series calculate train revenues, manage companies, track stock holdings, and compute dividend distributions.

### Key Features

- Player and company management with batch creation
- Customizable player/company symbols and colors (Japanese color names)
- Train route design with interactive stop editors (inline edit, quick +/-10, insert-before)
- Operating Round (OR) revenue tracking per company (1-5 ORs configurable)
- Stock holding percentage management per player per company
- Treasury stock tracking
- Dividend calculation (floor-rounded) and distribution display
- Summary dashboard with sorted player dividend and company revenue rankings
- Collapsible sections in company detail view (trains, stock holdings, dividends)
- Company navigation with previous/next buttons and status indicators
- Persistent state via browser localStorage with schema versioning and migration

## Tech Stack

| Layer       | Technology                                                             |
| ----------- | ---------------------------------------------------------------------- |
| Framework   | React 18.2                                                             |
| Build Tool  | Vite 7.3 with @vitejs/plugin-react                                     |
| Language    | JavaScript (no TypeScript), JSX file extensions                        |
| Styling     | Tailwind CSS 3.4 via PostCSS + Autoprefixer                            |
| Testing     | Vitest 3.2 + React Testing Library + jsdom                             |
| Linting     | ESLint 8 (react, react-hooks, jsx-a11y plugins) + Prettier             |
| Git Hooks   | Husky 9 + lint-staged 15                                               |
| Deployment  | GitHub Pages via GitHub Actions (deploy-pages workflow)                |
| State       | React useReducer/useCallback hooks, no external state library          |
| Persistence | Browser localStorage (key: `trainRevenue_18xx_data`, schema version 3) |

## Project Structure

```
train-revenue-calculator/
├── index.html              # Vite HTML entry point (lang="ja")
├── vite.config.js          # Vite config (react plugin, base path, vitest setup)
├── tailwind.config.js      # Tailwind config (custom brand/surface/status colors, ui font sizes)
├── postcss.config.js       # PostCSS config (tailwindcss + autoprefixer)
├── .eslintrc.cjs           # ESLint config (react, react-hooks, jsx-a11y, prettier)
├── .prettierrc.json        # Prettier config (singleQuote, trailingComma: es5, printWidth: 100)
├── .prettierignore         # build, node_modules, coverage
├── .husky/pre-commit       # Runs lint-staged
├── .githooks/pre-commit    # Runs lint + format:check
├── .github/workflows/
│   └── deploy-pages.yml    # GitHub Actions: build + deploy to GitHub Pages
├── public/                 # Static assets (favicon, logos, manifest, robots.txt)
├── src/
│   ├── main.jsx            # React DOM entry point (StrictMode, createRoot)
│   ├── App.jsx             # Root component (~545 lines): state reducer, handlers, view routing
│   ├── App.css             # App-level styles
│   ├── App.test.jsx        # Integration tests (11 tests: init, nav, CRUD, localStorage, a11y)
│   ├── index.css           # Global styles (Tailwind directives)
│   ├── setupTests.js       # Vitest/RTL setup
│   ├── components/
│   │   └── ui/
│   │       ├── Button.jsx  # Reusable button (variants: primary, secondary, danger, ghost)
│   │       ├── Card.jsx    # Reusable card container
│   │       ├── Input.jsx   # Reusable text/number input
│   │       ├── Modal.jsx   # Confirmation/info dialog (role="dialog", aria-modal)
│   │       └── SectionHeader.jsx  # Heading component (sizes: page, section, subsection)
│   ├── lib/
│   │   ├── calc.js         # Pure calculation functions (train revenue, OR totals, dividends)
│   │   ├── calc.test.js    # Unit tests for calc functions (10 tests)
│   │   └── labels.js       # Display name/color/symbol helpers, color-to-Tailwind class mappings
│   ├── storage/
│   │   ├── appStorage.js   # localStorage load/save/migrate with schema versioning
│   │   └── appStorage.test.js  # Unit tests for storage (3 tests)
│   └── views/
│       ├── summary/
│       │   └── SummaryView.jsx       # Dashboard: player dividends + company revenues (~162 lines)
│       ├── management/
│       │   └── ManagementView.jsx    # CRUD for players/companies, game settings (~350 lines)
│       └── company-detail/
│           └── CompanyDetailView.jsx # Per-company: trains, stock holdings, dividends (~812 lines)
├── docs/                   # Planning and design documents
├── package.json
└── package-lock.json
```

## Commands

```bash
npm start           # Dev server (Vite) on localhost:5173
npm run dev         # Same as npm start
npm test            # Vitest single-pass run (CI mode)
npm run test:watch  # Vitest watch mode (for development)
npm run build       # Production build to /dist
npm run preview     # Preview production build locally
npm run lint        # ESLint check on src/**/*.{js,jsx}
npm run lint:fix    # ESLint auto-fix
npm run format      # Prettier write (selected config files)
npm run format:check  # Prettier check
```

## Architecture

### Component Hierarchy

```
App (useReducer state, handlers, localStorage sync)
├── Modal (confirmation/info dialogs via components/ui/Modal)
├── NavButton (tab navigation: サマリー / 全般管理 / 企業詳細)
├── SummaryView (dashboard with player dividends + company revenues, setup wizard)
├── ManagementView (CRUD for players/companies, game settings, OR reset)
└── CompanyDetailView (selected company operations)
    ├── TrainCard (per-train route editor)
    │   ├── RevenueStopEditor (individual stop with inline edit, +/-10, insert-before, delete)
    │   └── RevenueInput (add new stops with preset grid + custom value)
    └── PercentageInputControl (stock % input with +/-10 buttons and 50% quick-set)
```

### State Management

- Root state managed via `useReducer` in `App` with actions: `PLAYER_SET_ALL`, `COMPANY_SET_ALL`, `COMPANY_SELECT`, `OR_SET_NUM`, `VIEW_SET`, `APP_LOAD`
- Setter functions wrapped in `useCallback` to support functional updates (like `useState`)
- State auto-saves to localStorage on every change via `useEffect` (skipped during initial load)
- View routing is manual via `currentView` state (`'summary'` | `'management'` | `'companyDetail'`)
- No React Router, Redux, or Context API

### Persistence Layer

- `src/storage/appStorage.js` handles all localStorage interactions
- Schema-versioned: current version is `APP_SCHEMA_VERSION = 3`
- `load()` returns `null` if schema version doesn't match (ignores legacy data)
- `migrate()` normalizes player/company data, filling missing fields with defaults
- `save()` writes state with `schemaVersion` and `lastUpdated` timestamp

### Data Model

```javascript
// Player
{
  id: string (UUID),
  seatLabel: string ('A', 'B', ...),
  displayName: string,
  name: string,
  color: string (Japanese color name: '赤', '青', etc.),
  symbol: string ('●', '▲', '■', etc.)
}

// Company
{
  id: string (UUID),
  name: string ('Co1', 'Co2', ...canonical name),
  displayName: string (user-editable, can be empty),
  genericIndex: number,
  color: string (Japanese color name),
  symbol: string ('○', '△', etc.),
  abbr: string,
  templateId: string | null,
  icon: string | null,
  trains: [{ id: string (UUID), stops: number[] }],
  stockHoldings: [{ playerId: string, percentage: number }],
  orRevenues: [{ orNum: number, revenue: number }],
  treasuryStockPercentage: number
}

// App State persisted to localStorage
{
  schemaVersion: number (currently 3),
  players: Player[],
  companies: Company[],
  selectedCompanyId: string | null,
  numORs: number (1-5),
  lastUpdated: string (ISO date)
}
```

### Calculation Logic

Pure functions in `src/lib/calc.js`:

- `calculateTrainRevenue(stops)` — sums stop values for a single train
- `calculateCompanyTrainRevenue(trains)` — sums all train revenues for a company
- `calculateCompanyTotalORRevenue(orRevenues, numORs)` — sums OR revenues up to `numORs`
- `calculateDividend(totalRevenue, percentage)` — floor-rounded percentage of revenue

### Display Labels & Colors

`src/lib/labels.js` provides:

- Default color/symbol assignment for players (6 colors) and companies (12 colors)
- Japanese color name to Tailwind CSS class mappings (`COLOR_STYLE_MAP`, `COLOR_TEXT_MAP`)
- Display name resolution with fallback chains (`getPlayerDisplayName`, `getCompanyDisplayName`)
- Seat labels: A-Z for first 26 players, then `P27`, `P28`, etc.

### Shared UI Components

Located in `src/components/ui/`:

- **Button** — variants: `primary`, `secondary`, `danger`, `ghost`; sizes: `md`, `lg`
- **Card** — white rounded container with border and shadow
- **Input** — styled text/number input with focus ring
- **Modal** — overlay dialog with confirm/cancel, accessible (role="dialog", aria-modal)
- **SectionHeader** — polymorphic heading (page/section/subsection sizes)

### Deletion Patterns

Deleting entities uses a two-step confirmation via `Modal`:

1. Set `confirmAction` callback and `modalMessage`
2. Modal triggers the callback on user confirm

When a player is deleted, their stock holdings are also removed from all companies.

## Code Conventions

- **Language**: UI text is in Japanese; code identifiers are in English
- **File extensions**: `.jsx` for React components, `.js` for pure logic
- **Components**: Functional components with hooks only (no class components)
- **Styling**: Tailwind CSS utility classes; custom design tokens defined in `tailwind.config.js` (brand, surface, status colors; ui font sizes)
- **IDs**: Generated via `crypto.randomUUID()`
- **Immutable updates**: State updates use spread operators and `map`/`filter` (no direct mutation)
- **Event handlers**: Named `handle*` in App, passed as props to child components
- **No prop-types or TypeScript**: No static type checking
- **Formatting**: Prettier (single quotes, trailing commas es5, 100 char line width, semicolons)
- **Linting**: ESLint with react, react-hooks, jsx-a11y, and prettier integration
- **Indentation**: 2 spaces

## Testing

Tests use Vitest + React Testing Library + jsdom. Configuration is in `vite.config.js` under the `test` key.

Test files:

- `src/App.test.jsx` — 11 integration tests (initial display, navigation, player/company CRUD, localStorage persistence, accessibility)
- `src/lib/calc.test.js` — 10 unit tests for calculation functions
- `src/storage/appStorage.test.js` — 3 unit tests for save/load/migrate

```bash
npm test            # Single-pass run (24 tests across 3 files)
npm run test:watch  # Watch mode for development
```

All 24 tests currently pass.

## Pre-commit Hooks

Husky runs `lint-staged` on commit, which:

- Runs `eslint --fix` and `prettier --write` on `src/**/*.{js,jsx,css}`
- Runs `prettier --write` on `*.{json,md}`

## Deployment

The app deploys to GitHub Pages at `https://satamoto7.github.io/train-revenue-calculator` via a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`):

- Triggers on push to `main` or manual dispatch
- Uses Node.js 22, runs `npm ci` + `npm run build`
- Uploads `./dist` directory as Pages artifact
- The `base` path in `vite.config.js` and `homepage` in `package.json` control asset URLs

## Known Limitations

- **Large CompanyDetailView**: `CompanyDetailView.jsx` is ~812 lines with several sub-components inlined
- **No error boundaries**: React error boundaries are not implemented
- **No TypeScript**: Plain JavaScript without type safety
- **Props drilling**: Handlers are passed through multiple component layers from App
- **Japanese-only**: All UI strings are hardcoded in Japanese
- **No i18n/l10n framework**: Localization would require extracting all strings
