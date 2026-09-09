# MONEYFLOW — Expense Tracker

A React application for manually tracking income, expenses, category budgets, and savings goals, with interactive reports and browser-based persistence.

**Status:** local demo application. AI features are planned and are not implemented.

## Features

- Local demo account creation, login, and logout.
- Add, edit, duplicate, delete, search, and filter transactions.
- Track income sources and savings transfers.
- Create weekly, monthly, and yearly category budgets.
- Manage savings goals and view progress.
- Explore spending charts, category breakdowns, and money flow reports.
- Customize categories, icons, colors, and appearance.
- Export data as CSV or JSON.
- Optional currency conversion through UniRate and merchant logos through Logo.dev.

## Technology

| Area | Implementation |
| --- | --- |
| Frontend | React 18, JavaScript, CSS |
| Development and build | Vite 5 |
| Routing | React Router 6 |
| State | React Context and reducer |
| Charts | Recharts, Chart.js, ECharts |
| Icons | React Icons |
| Persistence | Browser localStorage |
| Backend / database / AI | Not implemented |

## Run locally

Install Node.js with npm first. If your terminal says `command not found: node` or `command not found: npm`, complete the Node.js installer and reopen Terminal before continuing.

Verify installation:

```bash
node -v
npm -v
```

Inside the project folder:

```bash
npm install
npm run dev -- --open
```

The configured development port is 5173. Use the URL printed by Vite if that port is occupied. Press Control + C to stop the server.

For the original local folder on this Mac:

```bash
cd "/Users/sushan_adhikari/Desktop/expense-tracker-main"
npm install
npm run dev -- --open
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Generate production files in `dist/` |
| `npm run preview` | Preview a production build locally |

There are currently no test or lint scripts in `package.json`.

## Optional configuration

The app runs without API keys. Currency conversion and merchant logos need separate credentials.

The Vite configuration reads these custom files in the project root:

```dotenv
# unirateapi.env
VITE_UNIRATE_API_KEY=replace_with_your_key
```

```dotenv
# logodevapi.env
VITE_LOGODEV_API_KEY=replace_with_your_key
```

Restart the development server after changing configuration. Without these integrations, the app uses its base-currency behavior and category-icon fallbacks.

Add both custom filenames to `.gitignore` before adding credentials. Variables prefixed with `VITE_` are exposed to the browser; ignoring the files does not make bundled values secret. Private credentials, including any future AI key, belong on a backend. See [Vite environment documentation](https://vite.dev/guide/env-and-mode).

## Project structure

```text
public/
  data/seed.json          Sample data asset
src/
  components/            Shared controls, layout, and charts
  data/                  Default categories
  hooks/                 Storage, fetching, and logo hooks
  pages/                 Application screens
  state/AppState.jsx     Application state, reducer, persistence
  state/SessionState.jsx Local demo session handling
  utils/                 Calculations, exports, formatting, integrations
  App.jsx                Routes and route guards
  main.jsx               React entry point
  styles.css             Application styles
vite.config.js           Vite and custom environment-file configuration
```

## Architecture and data

Pages and components read shared state through React Context. User actions dispatch reducer updates in `AppState.jsx`. The app persists each user's application state under `et:app-state:<userId>` in localStorage; `et:app-state` is also declared as a legacy storage key. Demo account records use `et:auth-users`, and the active user ID uses `et:auth-session`.

Main records include transactions, categories, budgets, income sources, income entries, goals, and savings transfers. Income entries can reference a corresponding transaction. Budgets identify a category and a weekly, monthly, or yearly period. Savings transfers reference a goal.

Reports derive values from the stored records using utility selectors. Currency conversion is for display, with USD as the base currency. It does not create bank transactions.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Landing page; authenticated users normally redirect to dashboard |
| `/auth` | Demo login and sign-up |
| `/signup` | Redirect to sign-up mode or dashboard |
| `/about` | Redirect to landing page About section |
| `/dashboard` | Overview |
| `/transactions` | Transaction list |
| `/transactions/:id` | Transaction details |
| `/add` | Add an entry |
| `/budget` | Category budgets |
| `/reports` | Reports and visualizations |
| `/categories` | Category management |
| `/wallet` | Wallet screen |
| `/goals` | Savings goals |
| `/settings` | Preferences and exports |
| Other paths | 404 page |

Application screens require a local demo session. This browser-side route guard is not server-side authorization.

## Current limitations

- No backend database, cross-device synchronization, or real bank connection.
- Google and GitHub login are placeholders rather than connected OAuth flows.
- Browser storage can be edited or cleared by the user; it is not a secure account system.
- Demo password handling uses SHA-256 when available and falls back to the original string when unavailable. Do not use real passwords or treat this as production authentication.
- Clearing browser storage can remove demo accounts and financial records.
- AI assistance is not implemented; see [the AI integration plan](AI-INTEGRATION.md).

## Verification before publishing

Run `npm run build`, then `npm run preview`. Manually check sign-up, login, transaction creation/edit/deletion, budgets, goals, reports, exports, and persistence after refresh. Verify that two demo accounts show their respective data and that the app works without optional API keys.

These are recommended checks, not a claim that this documentation review executed them.

## GitHub and future work

See [the GitHub setup guide](GITHUB-SETUP.md) for publishing instructions and [the AI integration plan](AI-INTEGRATION.md) for a proposed first AI feature.

Original project repository: [expense-tracker-main](https://github.com/Sushan2004/expense-tracker-main). See also [the original README](README.original.md).

## Attribution and license

The supplied README describes this code as a CSC 365 final project. Preserve applicable original credits and license terms when publishing a derivative. Add the original repository URL and describe your own contributions when that information is available. No LICENSE file was present in the reviewed folder; this documentation does not assign a new license or establish ownership.
