# Coin Rich AI / CryptoTracker

A React + Vite + TypeScript crypto portfolio and market intelligence frontend.

## Current MVP

- Clerk authentication with Supabase RLS-backed portfolio persistence
- CoinGecko global market and asset data
- Alternative.me Fear & Greed Index
- Portfolio valuation and P/L calculations
- Market charts and screening UI
- Responsive dark trading-dashboard UI

## Important architecture notes

The repository is a frontend MVP. Live exchange execution, custody, smart contracts, ML training, and production AI serving are **not** implemented here yet.

Do not place server secrets in Vite environment variables. `VITE_*` variables are client-visible. Keep `CLERK_SECRET_KEY` and future exchange/API secrets in a backend or secret manager.

## Setup

```bash
cp .env.example .env
# Set VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev
```

## Production roadmap

1. Backend API + market-data ingestion
2. Redis caching and WebSocket/SSE updates
3. Portfolio/risk service
4. Paper-trading engine
5. Tuffy AI service with tool access to market/portfolio data
6. Exchange execution with encrypted API credentials
7. Wallet/Web3 integration and audited contracts
8. Security, compliance, observability, and CI/CD
