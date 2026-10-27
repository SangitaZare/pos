# POS

Point-of-sale app: product catalogue, cart, checkout and receipts, with a real-time dashboard.

## Layout

```
pos/
├─ backend/     .NET Web API — PosApi.csproj at this level
└─ frontend/    Angular (pos-app)
```

## Run

```bash
# backend  →  https://localhost:7064
cd pos/backend && dotnet run

# frontend →  http://localhost:4200
cd pos/frontend && npm install && npm start
```
