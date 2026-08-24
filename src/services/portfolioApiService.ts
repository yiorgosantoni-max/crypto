export interface AddAssetRequest {
  symbol: string;
  quantity: number;
  use_real_time_price?: boolean;
  custom_price?: number;
}

export interface PortfolioEntry {
  id: string;
  symbol: string;
  quantity: number;
  price_used: number;
  total_cost: number;
  timestamp: string;
  name: string;
  coin_id: string;
}

export interface AggregatedHolding {
  symbol: string;
  name: string;
  coin_id: string;
  total_quantity: number;
  average_buy_price: number;
  total_invested: number;
  current_price: number;
  current_value: number;
  profit_or_loss: number;
  profit_or_loss_percentage: number;
  entries: PortfolioEntry[];
}

export interface PortfolioSummary {
  total_portfolio_value: number;
  total_invested: number;
  total_profit_or_loss: number;
  total_profit_or_loss_percentage: number;
  holdings: AggregatedHolding[];
}

interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
}

class PortfolioApiService {
  private coinCache: { [key: string]: { price: number; name: string; coin_id: string; timestamp: number } } = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private async fetchCoinPrice(symbol: string): Promise<{ price: number; name: string; coin_id: string }> {
    const normalizedSymbol = symbol.trim().toLowerCase();
    if (!normalizedSymbol) {
      throw new Error("Coin symbol is required");
    }

    const cached = this.coinCache[normalizedSymbol];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { price: cached.price, name: cached.name, coin_id: cached.coin_id };
    }

    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&sparkline=false"
    );
    if (!response.ok) {
      throw new Error(`CoinGecko request failed with status ${response.status}`);
    }

    const markets = (await response.json()) as CoinMarket[];
    const coin = markets.find((market) => market.symbol.toLowerCase() === normalizedSymbol);
    if (!coin || typeof coin.current_price !== "number" || coin.current_price <= 0) {
      throw new Error(`Coin ${symbol} not found or has no valid USD price`);
    }

    const result = { price: coin.current_price, name: coin.name, coin_id: coin.id };
    this.coinCache[normalizedSymbol] = { ...result, timestamp: Date.now() };
    return result;
  }

  async addAsset(
    request: AddAssetRequest,
    userId: string,
    getValidToken: () => Promise<string | null>
  ): Promise<PortfolioEntry> {
    const { symbol, quantity, use_real_time_price = true, custom_price } = request;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive number");
    }

    let price_used: number;
    let name: string;
    let coin_id: string;

    if (use_real_time_price) {
      const coinData = await this.fetchCoinPrice(symbol);
      price_used = coinData.price;
      name = coinData.name;
      coin_id = coinData.coin_id;
    } else {
      if (!Number.isFinite(custom_price) || custom_price <= 0) {
        throw new Error("Custom price must be a positive number when real-time pricing is disabled");
      }
      price_used = custom_price;

      try {
        const coinData = await this.fetchCoinPrice(symbol);
        name = coinData.name;
        coin_id = coinData.coin_id;
      } catch {
        name = symbol.trim().toUpperCase();
        coin_id = symbol.trim().toLowerCase();
      }
    }

    const total_cost = quantity * price_used;
    const timestamp = new Date().toISOString();
    const { portfolioService } = await import("./portfolioService");

    const holdingData = {
      symbol: symbol.trim().toUpperCase(),
      name,
      amount: quantity,
      avgPrice: price_used,
      purchaseDate: timestamp.split("T")[0],
      coinId: coin_id,
      notes: `Added via API - Total cost: $${total_cost.toFixed(2)}`,
    };

    const savedHolding = await portfolioService.createHolding(userId, getValidToken, holdingData);
    return {
      id: savedHolding.id,
      symbol: symbol.trim().toUpperCase(),
      quantity,
      price_used,
      total_cost,
      timestamp,
      name,
      coin_id,
    };
  }

  async getPortfolio(
    userId: string,
    getValidToken: () => Promise<string | null>
  ): Promise<PortfolioSummary> {
    const { portfolioService } = await import("./portfolioService");
    const holdings = await portfolioService.fetchHoldings(userId, getValidToken);

    if (holdings.length === 0) {
      return { total_portfolio_value: 0, total_invested: 0, total_profit_or_loss: 0, total_profit_or_loss_percentage: 0, holdings: [] };
    }

    const groupedHoldings: { [symbol: string]: AggregatedHolding } = {};
    const uniqueCoinIds = [...new Set(holdings.map((h) => h.coinId))];
    const currentPrices: { [coinId: string]: number } = {};

    try {
      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniqueCoinIds.join(","))}&vs_currencies=usd`
      );
      if (!priceResponse.ok) throw new Error(`Price request failed with status ${priceResponse.status}`);
      const priceData = (await priceResponse.json()) as Record<string, { usd?: number }>;

      for (const coinId of uniqueCoinIds) {
        const price = priceData[coinId]?.usd;
        if (typeof price === "number" && Number.isFinite(price) && price > 0) {
          currentPrices[coinId] = price;
        }
      }
    } catch (error) {
      console.error("Error fetching current prices:", error);
    }

    for (const holding of holdings) {
      const symbol = holding.symbol;
      if (!groupedHoldings[symbol]) {
        groupedHoldings[symbol] = {
          symbol,
          name: holding.name,
          coin_id: holding.coinId,
          total_quantity: 0,
          average_buy_price: 0,
          total_invested: 0,
          current_price: currentPrices[holding.coinId] ?? holding.avgPrice,
          current_value: 0,
          profit_or_loss: 0,
          profit_or_loss_percentage: 0,
          entries: [],
        };
      }

      const entry: PortfolioEntry = {
        id: holding.id,
        symbol: holding.symbol,
        quantity: holding.amount,
        price_used: holding.avgPrice,
        total_cost: holding.amount * holding.avgPrice,
        timestamp: holding.purchaseDate,
        name: holding.name,
        coin_id: holding.coinId,
      };

      groupedHoldings[symbol].entries.push(entry);
      groupedHoldings[symbol].total_quantity += holding.amount;
      groupedHoldings[symbol].total_invested += holding.amount * holding.avgPrice;
    }

    for (const group of Object.values(groupedHoldings)) {
      group.average_buy_price = group.total_quantity > 0 ? group.total_invested / group.total_quantity : 0;
      group.current_value = group.total_quantity * group.current_price;
      group.profit_or_loss = group.current_value - group.total_invested;
      group.profit_or_loss_percentage = group.total_invested > 0
        ? (group.profit_or_loss / group.total_invested) * 100
        : 0;
    }

    const aggregatedHoldings = Object.values(groupedHoldings);
    const total_portfolio_value = aggregatedHoldings.reduce((sum, h) => sum + h.current_value, 0);
    const total_invested = aggregatedHoldings.reduce((sum, h) => sum + h.total_invested, 0);
    const total_profit_or_loss = total_portfolio_value - total_invested;
    const total_profit_or_loss_percentage = total_invested > 0 ? (total_profit_or_loss / total_invested) * 100 : 0;

    return { total_portfolio_value, total_invested, total_profit_or_loss, total_profit_or_loss_percentage, holdings: aggregatedHoldings };
  }

  async deleteAsset(assetId: string, userId: string, getValidToken: () => Promise<string | null>): Promise<void> {
    const { portfolioService } = await import("./portfolioService");
    await portfolioService.deleteHolding(userId, getValidToken, assetId);
  }
}

export const portfolioApiService = new PortfolioApiService();
