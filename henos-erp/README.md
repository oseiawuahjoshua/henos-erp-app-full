# Henos Energy ERP — React Edition

A fully client-side ERP system for **Henos Energy Company Limited**, rebuilt in **React 19 + Vite + Tailwind CSS v4 + React Router 7 + React Hook Form**.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 6 | Build tool & dev server |
| Tailwind CSS | 4 | Styling via `@tailwindcss/vite` |
| React Router | 7 | Client-side routing |
| React Hook Form | 7 | Form state & validation |
| Recharts | 2 | Dashboard donut chart |

## Project Structure

```
src/
├── main.jsx                   # Entry point
├── App.jsx                    # Auth gate → AppShell
├── index.css                  # Tailwind v4 + global styles
│
├── context/
│   └── AppContext.jsx          # Global state (useReducer) — all DB, EP, ESG, holdings
│
├── hooks/
│   └── useToast.js             # Toast notification hook
│
├── utils/
│   └── helpers.js              # uid, money, today, formulas, constants
│
├── components/
│   ├── ui.jsx                  # Badge, Button, Card, Table, Drawer, Modal, Toast, etc.
│   └── AppShell.jsx            # Sidebar, topbar, bottom nav, routing
│
└── pages/
    ├── Login.jsx               # Animated login with splash screen
    ├── Dashboard.jsx           # KPIs + order donut + module grid
    ├── Commercial.jsx          # Orders, customers, pricing
    ├── Accounts.jsx            # Invoices, expenses, balances, P&L
    ├── Operations.jsx          # Review, deliver, delivered log, stock, holding areas
    ├── EaziGas.jsx             # Exchange point daily stock tracking + print
    ├── Marketing.jsx           # Campaigns & leads
    ├── ESG.jsx                 # ESG activity logging & scoring
    ├── Stations.jsx            # LPG station tank gauges
    └── Settings.jsx            # Company config & preferences
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Default Login Credentials

| Employee ID | Password |
|---|---|
| `HN-001` | `henos2025` |
| `HN-002` | `henos2025` |
| `admin` | `admin123` |

## Deploying to GitHub Pages

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to GitHub Pages
3. Or use the Vite GitHub Pages plugin for automatic deployment

## Features

- 🔐 Login with animated splash screen
- 📊 Dashboard with KPI cards and order donut chart
- 🛒 Commercial — orders, customers, pricing
- 🧾 Accounts — invoices, payments, balances, P&L
- ⬢ Operations — order review/approval, delivered orders log with date filter, stock, delivery tracking, ELH/Kumasi/Winneba CDO holding areas
- 🔄 EaziGas — multi exchange point cylinder recirculation tracking (9-column table with print)
- ⛽ LPG Stations — tank level gauges, document expiry tracking
- 📈 Marketing — campaigns and leads pipeline
- 🌿 ESG — environmental, social & governance scoring
- ⚙️ Settings — company config, team, toggles
- 🌙 Dark mode toggle
- 📱 Fully responsive — desktop sidebar + mobile bottom nav

---

*Henos Energy Company Limited · Energizing Progress · Ghana*
