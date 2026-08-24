import { createAuthedSupabaseClient } from "@/integrations/supabase/client";

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  avgPrice: number;
  currentPrice: number;
  purchaseDate: string;
  coinId: string;
  notes?: string;
}

export interface CreateHoldingData {
  symbol: string;
  name: string;
  amount: number;
  avgPrice: number;
  purchaseDate: string;
  coinId: string;
  notes?: string;
}

export class PortfolioService {
  private async getAuthedClient(getValidToken: () => Promise<string | null>) {
    const token = await getValidToken();
    if (!token) {
      throw new Error("Failed to get valid authentication token");
    }
    return createAuthedSupabaseClient(token);
  }

  async fetchHoldings(userId: string, getValidToken: () => Promise<string | null>): Promise<PortfolioHolding[]> {
    const authedSupabase = await this.getAuthedClient(getValidToken);
    const { data, error } = await authedSupabase
      .from("portfolio_holdings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((holding) => ({
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      amount: holding.amount,
      avgPrice: holding.avg_price,
      currentPrice: holding.avg_price,
      purchaseDate: holding.purchase_date,
      coinId: holding.coin_id,
      notes: holding.notes,
    }));
  }

  async createHolding(
    userId: string,
    getValidToken: () => Promise<string | null>,
    holdingData: CreateHoldingData
  ) {
    const authedSupabase = await this.getAuthedClient(getValidToken);
    const { data, error } = await authedSupabase
      .from("portfolio_holdings")
      .insert({
        user_id: userId,
        symbol: holdingData.symbol,
        name: holdingData.name,
        amount: holdingData.amount,
        avg_price: holdingData.avgPrice,
        coin_id: holdingData.coinId,
        purchase_date: holdingData.purchaseDate,
        notes: holdingData.notes || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateHolding(
    userId: string,
    getValidToken: () => Promise<string | null>,
    holdingId: string,
    updateData: Partial<CreateHoldingData>
  ) {
    const authedSupabase = await this.getAuthedClient(getValidToken);
    const updatePayload: Partial<{
      symbol: string;
      name: string;
      amount: number;
      avg_price: number;
      coin_id: string;
      purchase_date: string;
      notes: string | null;
    }> = {};

    if (updateData.symbol) updatePayload.symbol = updateData.symbol;
    if (updateData.name) updatePayload.name = updateData.name;
    if (updateData.amount !== undefined) updatePayload.amount = updateData.amount;
    if (updateData.avgPrice !== undefined) updatePayload.avg_price = updateData.avgPrice;
    if (updateData.coinId) updatePayload.coin_id = updateData.coinId;
    if (updateData.purchaseDate) updatePayload.purchase_date = updateData.purchaseDate;
    if (updateData.notes !== undefined) updatePayload.notes = updateData.notes;

    const { data, error } = await authedSupabase
      .from("portfolio_holdings")
      .update(updatePayload)
      .eq("id", holdingId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async deleteHolding(
    userId: string,
    getValidToken: () => Promise<string | null>,
    holdingId: string
  ) {
    const authedSupabase = await this.getAuthedClient(getValidToken);
    const { error } = await authedSupabase
      .from("portfolio_holdings")
      .delete()
      .eq("id", holdingId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }
}

export const portfolioService = new PortfolioService();
