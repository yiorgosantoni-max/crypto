
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

class PortfolioApiService {
  private coinCache: { [key: string]: { price: number; name: string; coin_id: string; timestamp: number } } = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private async fetchCoinPrice(symbol: string): Promise<{ price: number; name: string; coin_id: string }> {
    const cacheKey = symbol.toLowerCase();
    const cached = this.coinCache[cacheKey];
    
    // Return cached data if it's still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return {
        price: cached.price,
        name: cached.name,
        coin_id: cached.coin_id
      };
    }

    try {
      // Use markets endpoint for better performance and correct naming
      const marketResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${symbol}&order=market_cap_desc&per_page=1&sparkline=false`
      );
      
      if (marketResponse.ok) {
        const marketData = await marketResponse.json();
        if (marketData.length > 0) {
          const coin = marketData[0];
          const result = {
            price: coin.current_price,
            name: coin.name,
            coin_id: coin.id
          };
          
          // Cache the result
          this.coinCache[cacheKey] = {
            ...result,
            timestamp: Date.now()
          };
          
          return result;
        }
      }

      // Fallback: Search by symbol in markets data
      const marketsBySymbolResponse = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&sparkline=false'
      );
      
      if (marketsBySymbolResponse.ok) {
        const allMarkets = await marketsBySymbolResponse.json();
        const coin = allMarkets.find((c: any) => 
          c.symbol.toLowerCase() === symbol.toLowerCase()
        );
        
        if (coin) {
          const result = {
            price: coin.current_price,
            name: coin.name,
            coin_id: coin.id
          };
          
          // Cache the result
          this.coinCache[cacheKey] = {
            ...result,
            timestamp: Date.now()
          };
          
          return result;
        }
      }

      // Final fallback to coin list
      const coinListResponse = await fetch('https://api.coingecko.com/api/v3/coins/list');
      const coinList = await coinListResponse.json();
      
      const coin = coinList.find((c: any) => 
        c.symbol.toLowerCase() === symbol.toLowerCase()
      );
      
      if (!coin) {
        throw new Error(`Coin ${symbol} not found`);
      }

      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`
      );
      
      if (!priceResponse.ok) {
        throw new Error('Failed to fetch price data');
      }
      
      const priceData = await priceResponse.json();
      const price = priceData[coin.id]?.usd;
      
      if (!price) {
        throw new Error(`Price not available for ${symbol}`);
      }

      const result = {
        price,
        name: coin.name,
        coin_id: coin.id
      };
      
      // Cache the result
      this.coinCache[cacheKey] = {
        ...result,
        timestamp: Date.now()
      };

      return result;
    } catch (error) {
      console.error('Error fetching coin price:', error);
      throw new Error(`Unable to fetch price for ${symbol}`);
    }
  }

  async addAsset(
    request: AddAssetRequest,
    userId: string,
    getValidToken: () => Promise<string | null>
  ): Promise<PortfolioEntry> {
    const { symbol, quantity, use_real_time_price = true, custom_price } = request;

    let price_used: number;
    let name: string;
    let coin_id: string;

    if (use_real_time_price) {
      const coinData = await this.fetchCoinPrice(symbol);
      price_used = coinData.price;
      name = coinData.name;
      coin_id = coinData.coin_id;
    } else {
      if (!custom_price) {
        throw new Error('Custom price is required when use_real_time_price is false');
      }
      price_used = custom_price;
      
      // Try to get coin name and ID even for custom price
      try {
        const coinData = await this.fetchCoinPrice(symbol);
        name = coinData.name;
        coin_id = coinData.coin_id;
      } catch {
        name = symbol.toUpperCase();
        coin_id = symbol.toLowerCase();
      }
    }

    const total_cost = quantity * price_used;
    const timestamp = new Date().toISOString();

    // Use existing portfolio service to save to Supabase
    const { portfolioService } = await import('./portfolioService');
    
    const holdingData = {
      symbol: symbol.toUpperCase(),
      name,
      amount: quantity,
      avgPrice: price_used,
      purchaseDate: timestamp.split('T')[0],
      coinId: coin_id,
      notes: `Added via API - Total cost: $${total_cost.toFixed(2)}`
    };

    const savedHolding = await portfolioService.createHolding(
      userId,
      getValidToken,
      holdingData
    );

    return {
      id: savedHolding.id,
      symbol: symbol.toUpperCase(),
      quantity,
      price_used,
      total_cost,
      timestamp,
      name,
      coin_id
    };
  }

  async getPortfolio(
    userId: string,
    getValidToken: () => Promise<string | null>
  ): Promise<PortfolioSummary> {
    // Fetch holdings from Supabase
    const { portfolioService } = await import('./portfolioService');
    const holdings = await portfolioService.fetchHoldings(userId, getValidToken);

    if (holdings.length === 0) {
      return {
        total_portfolio_value: 0,
        total_invested: 0,
        total_profit_or_loss: 0,
        total_profit_or_loss_percentage: 0,
        holdings: []
      };
    }

    // Group holdings by symbol and calculate aggregates
    const groupedHoldings: { [symbol: string]: AggregatedHolding } = {};

    // Get current prices for all unique coin IDs in batch for better performance
    const uniqueCoinIds = [...new Set(holdings.map(h => h.coinId))];
    const currentPrices: { [coinId: string]: number } = {};

    try {
      // Batch fetch current prices
      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueCoinIds.join(',')}&vs_currencies=usd`
      );
      const priceData = await priceResponse.json();
      
      for (const coinId of uniqueCoinIds) {
        currentPrices[coinId] = priceData[coinId]?.usd || 0;
      }
    } catch (error) {
      console.error('Error fetching current prices:', error);
      // Fallback to average price if real-time prices fail
      for (const coinId of uniqueCoinIds) {
        currentPrices[coinId] = 0;
      }
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
          current_price: currentPrices[holding.coinId] || holding.avgPrice,
          current_value: 0,
          profit_or_loss: 0,
          profit_or_loss_percentage: 0,
          entries: []
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
        coin_id: holding.coinId
      };

      groupedHoldings[symbol].entries.push(entry);
      groupedHoldings[symbol].total_quantity += holding.amount;
      groupedHoldings[symbol].total_invested += holding.amount * holding.avgPrice;
    }

    // Calculate weighted averages and profit/loss
    for (const symbol in groupedHoldings) {
      const group = groupedHoldings[symbol];
      group.average_buy_price = group.total_invested / group.total_quantity;
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
    const total_profit_or_loss_percentage = total_invested > 0 
      ? (total_profit_or_loss / total_invested) * 100 
      : 0;

    return {
      total_portfolio_value,
      total_invested,
      total_profit_or_loss,
      total_profit_or_loss_percentage,
      holdings: aggregatedHoldings
    };
  }

  async deleteAsset(
    assetId: string,
    userId: string,
    getValidToken: () => Promise<string | null>
  ): Promise<void> {
    const { portfolioService } = await import('./portfolioService');
    await portfolioService.deleteHolding(userId, getValidToken, assetId);
  }
}

export const portfolioApiService = new PortfolioApiService();
