# Expense Tracker

A modern manual-first expense tracker built with React and Vite.

This project was created as a **CSC 365 final project** and is mainly for **learning, experimentation, and demo purposes**. The app focuses on helping users track income, expenses, budgets, savings goals, and reports in a clean dashboard-style experience.

## What this project is

This app is a frontend-heavy personal finance tracker where users can:

- create a local demo account
- add income and expenses manually
- organize spending with built-in and custom categories
- set weekly, monthly, and yearly category budgets
- track savings goals and savings transfers
- view reports, charts, and money flow visualizations
- change theme and display currency
- export their data as CSV or JSON

This project is designed to work **without a backend**. Most user data is saved locally in the browser for demo use.

## What we are doing this for

The goal of this project is to explore:

- React application architecture
- dashboard and finance UI design
- local demo authentication
- data visualization with charts
- app state management and local persistence
- integrating third-party APIs in a safe, optional way

This is **not a production banking app**. It is a class/demo project made for fun and learning.

## Tech stack

- React 18
- Vite
- React Router
- Recharts
- Chart.js + `react-chartjs-2`
- ECharts + `echarts-for-react`
- React Icons

## Main features

### Public pages

- Landing page
- Local demo auth page
- Custom 404 page

### Auth

- Sign up and log in locally
- Demo users are stored in browser `localStorage`
- Session persists after refresh
- Logout supported

### Dashboard

- Monthly cashflow hero
- Spending-over-time chart
- Recent transactions
- Spending by category
- Savings progress

### Transactions

- Add, edit, duplicate, and delete transactions
- Expense, income, and savings transfer support
- Merchant logos with fallback category icons
- Search, filter, sort, and date range controls

### Categories

- Built-in default categories
- Custom category creation
- Custom icon and color support
- Delete protection for built-in categories

### Budgeting

- Weekly, monthly, and yearly category budgets
- Budget thresholds and warning states
- Budget progress tracking from real expense data

### Reports

- KPI cards
- Spending breakdown doughnut chart
- Expandable chart modal
- Money Flow / Sankey chart
- Insight cards based on current report period

### Savings / Goals

- Savings goals
- Transfer money into goals
- Income sources list
- Savings progress display

### Settings

- Appearance theme selection
- Display currency selection
- Export data as CSV or JSON
- Local session controls

## Local/demo behavior

This project currently works as a **local demo app**:

- authentication is local only
- user data is stored in browser storage
- there is no backend database
- there is no real bank connection

Important:

- this is **not secure production auth**
- data is tied to the browser where it was created
- clearing browser storage can remove the saved demo data

## Features that need your own API key

Some parts of the app are optional integrations and need your own API credentials to work fully.

### 1. Currency conversion

Used for display-only currency conversion across the app.

- API: **UniRate**
- File: `unirateapi.env`
- Required variable:

```env
VITE_UNIRATE_API_KEY=your_key_here
```

Without this key:

- the app still works
- amounts stay in the base currency (`USD`)
- currency conversion will show as unavailable

Related code:

- [src/utils/currencyApi.js](C:\Users\RYET\Downloads\website\src\utils\currencyApi.js)
- [src/pages/Settings.jsx](C:\Users\RYET\Downloads\website\src\pages\Settings.jsx)

### 2. Merchant logos

Used to show merchant logos for known expense merchants.

- API: **Logo.dev**
- File: `logodevapi.env`
- Required variable:

```env
VITE_LOGODEV_API_KEY=your_key_here
```

Without this key:

- the app still works
- merchant logos will not load
- the UI falls back to category icons

Related code:

- [src/utils/logoDev.js](C:\Users\RYET\Downloads\website\src\utils\logoDev.js)
- [src/hooks/useMerchantLogo.js](C:\Users\RYET\Downloads\website\src\hooks\useMerchantLogo.js)

## Features that are placeholders or not fully implemented

These parts are intentionally incomplete or demo-only:

- **Google login**: UI only, not connected to real OAuth
- **GitHub login**: UI only, not connected to real OAuth
- **Bank sync / Connect bank account**: placeholder only, no Plaid/live bank integration yet
- **Production auth/security**: not implemented
- **Backend/database sync**: not implemented

## 404 page

The app includes a custom 404 page for unknown routes.

- Fallback route is defined in [src/App.jsx](C:\Users\RYET\Downloads\website\src\App.jsx)
- 404 page component is [src/pages/NotFound.jsx](C:\Users\RYET\Downloads\website\src\pages\NotFound.jsx)

If a user visits a bad URL, they will see:

- `404`
- `Page not found`
- a button to go to `/dashboard`
- a button to go back to `/`

## Project routes

### Public

- `/` - landing page
- `/auth` - sign up / log in
- `/signup` - redirects to sign up mode
- `/about` - redirects to landing about section

### Protected app routes

- `/dashboard`
- `/transactions`
- `/transactions/:id`
- `/add`
- `/budget`
- `/reports`
- `/categories`
- `/wallet`
- `/goals`
- `/settings`

## Running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Add optional API keys

Create or update these files in the project root:

- `unirateapi.env`
- `logodevapi.env`

Example:

```env
# unirateapi.env
VITE_UNIRATE_API_KEY=your_key_here
```

```env
# logodevapi.env
VITE_LOGODEV_API_KEY=your_key_here
```

### 3. Start the dev server

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

