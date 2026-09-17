# Swing Terminal (React + Node)

Local clone of the NSE swing / momentum terminal: Market Pulse, screener, watchlist + EOD alerts, sector rotation, indices, news, institutional flow, and charts.

## Run

```bash
npm install --prefix server
npm install --prefix client
npm run dev --prefix server
npm run dev --prefix client
```

- API: http://localhost:4000
- App: http://localhost:5173

## Login

- Email: `admin123@gmail.com`
- Password: `admin@1234567890`

Market data is seeded nightly-style artifacts (same screens as the live product). Watchlist and alerts persist in API memory for the process lifetime.
