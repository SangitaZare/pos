# POS

Point-of-sale app: product catalogue, cart, checkout and receipts, with a real-time dashboard.

## Stack

**Backend** ASP.NET Core Web API · SignalR · EF Core (SQLite) with migrations · QRCoder · Swagger
**Frontend** Angular · TypeScript

## What it does

- **Product catalogue** with cart and checkout
- **Receipts** generated per sale, with QR codes via QRCoder
- **Live dashboard over SignalR** — sales pushed to connected clients as they happen,
  so the dashboard updates without polling
- **EF Core migrations** — the schema is versioned rather than hand-built
- Sales recorded as `Sale` plus `SaleItem` lines, so each transaction keeps its detail

## Layout

```
pos/
├─ backend/     .NET Web API — PosApi.csproj at this level
│  └─ Hubs/PosHub.cs — the SignalR hub
└─ frontend/    Angular (pos-app)
```

## Run

```bash
# backend  →  https://localhost:7064
cd pos/backend && dotnet run

# frontend →  http://localhost:4200
cd pos/frontend && npm install && npm start
```

Swagger UI is served at the backend root in development. Open the dashboard in a second
browser window and complete a sale to watch it update live.
