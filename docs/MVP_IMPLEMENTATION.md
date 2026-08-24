# Coin Rich AI MVP implementation notes

## Implemented in this revision

- Removed the distributed `.env` secret and added `.env.example`.
- Added a small Node API service under `server/index.mjs`.
- Added health, CoinGecko global, CoinGecko top-coins, and Fear & Greed proxy endpoints.
- Added an OpenAI-compatible Tuffy AI endpoint that keeps the model secret server-side.
- Routed dashboard global/coin data through the API when `VITE_API_BASE_URL` is configured.
- Removed fabricated portfolio summary fallbacks.
- Removed fabricated Fear & Greed fallback values.
- Replaced random Market Pulse/Sentiment values with transparent indicators derived from real public market data.
- Reworked portfolio analytics so best/worst performer, concentration, average hold time, P/L, and allocation are calculated from holdings instead of hardcoded demo numbers.
- Added database constraints for positive quantities/prices and a safer update RLS policy.
- Removed the destructive `DROP TABLE` migration behavior.

## Still intentionally out of scope

- Live exchange order execution
- Custody/signing of user funds
- Smart contracts, staking, governance, NFTs
- ML training/backtesting/RL
- KYC/AML workflows
- Production Redis/message-bus infrastructure
- Institutional-grade WebSocket market-data ingestion

Those should be separate phases with security and compliance review.
