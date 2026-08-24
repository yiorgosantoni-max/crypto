import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, PieChart, Target, Shield } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';

interface PortfolioAnalyticsProps {
  holdings: Array<{
    id: string;
    symbol: string;
    name: string;
    amount: number;
    avgPrice: number;
    currentPrice: number;
    purchaseDate: string;
    coinId: string;
  }>;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899'];

const PortfolioAnalytics = ({ holdings }: PortfolioAnalyticsProps) => {
  const totalValue = holdings.reduce((sum, h) => sum + h.amount * h.currentPrice, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.amount * h.avgPrice, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPercentage = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const pieData = holdings
    .map(h => ({ name: h.symbol, value: h.amount * h.currentPrice }))
    .filter(item => item.value > 0);

  const weightedRisk = pieData.length
    ? pieData.reduce((sum, item) => {
        const weight = item.value / totalValue;
        return sum + weight * weight;
      }, 0)
    : 0;
  const concentration = Math.round(weightedRisk * 100);
  const riskLabel = concentration >= 50 ? 'High concentration' : concentration >= 30 ? 'Moderate concentration' : 'Diversified';

  const best = [...holdings]
    .map(h => ({ ...h, pnlPct: h.avgPrice > 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0 }))
    .sort((a, b) => b.pnlPct - a.pnlPct)[0];
  const worst = [...holdings]
    .map(h => ({ ...h, pnlPct: h.avgPrice > 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0 }))
    .sort((a, b) => a.pnlPct - b.pnlPct)[0];

  const averageHoldDays = holdings.length
    ? holdings.reduce((sum, h) => sum + Math.max(0, (Date.now() - new Date(h.purchaseDate).getTime()) / 86400000), 0) / holdings.length
    : 0;

  // A truthful performance view: invested capital vs current marked value.
  const performanceData = totalCost > 0
    ? [{ date: 'Invested', value: totalCost }, { date: 'Current', value: totalValue }]
    : [];

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <Card className="bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-red-400" /> Portfolio Performance</CardTitle>
          <span className="text-xs text-gray-500">Invested vs current</span>
        </CardHeader>
        <CardContent>
          {performanceData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} formatter={(value: number) => [formatCurrency(value), 'Value']} />
                  <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-64 flex items-center justify-center text-sm text-gray-500">Add an asset to start tracking performance.</div>}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold text-white flex items-center gap-2"><PieChart className="w-6 h-6 text-orange-400" /> Asset Allocation</CardTitle>
          <Target className="w-5 h-5 text-gray-400" />
        </CardHeader>
        <CardContent>
          {pieData.length ? (
            <div className="h-64 flex items-center">
              <div className="w-2/3 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} formatter={(value: number) => [formatCurrency(value), 'Value']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/3 space-y-2">
                {pieData.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-gray-300">{item.name}</span>
                    <span className="text-xs text-gray-500">{((item.value / totalValue) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="h-64 flex items-center justify-center text-sm text-gray-500">No asset allocation data yet.</div>}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-800">
        <CardHeader><CardTitle className="text-xl font-semibold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-yellow-400" /> Portfolio Risk Snapshot</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div><p className="text-sm text-gray-400">Concentration</p><p className="text-lg font-semibold text-white">{riskLabel}</p><p className="text-xs text-gray-500">HHI: {concentration}%</p></div>
            <div><p className="text-sm text-gray-400">Average Hold</p><p className="text-lg font-semibold text-white">{averageHoldDays ? `${averageHoldDays.toFixed(0)} days` : 'N/A'}</p></div>
            <div><p className="text-sm text-gray-400">Best Performer</p><p className="text-lg font-semibold text-green-400">{best?.symbol ?? 'N/A'}</p><p className="text-xs text-gray-500">{best ? `${best.pnlPct >= 0 ? '+' : ''}${best.pnlPct.toFixed(2)}%` : 'No data'}</p></div>
            <div><p className="text-sm text-gray-400">Worst Performer</p><p className="text-lg font-semibold text-red-400">{worst?.symbol ?? 'N/A'}</p><p className="text-xs text-gray-500">{worst ? `${worst.pnlPct >= 0 ? '+' : ''}${worst.pnlPct.toFixed(2)}%` : 'No data'}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-800">
        <CardHeader><CardTitle className="text-xl font-semibold text-white">Current P/L</CardTitle></CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totalPnL)}</div>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
            {totalPnL >= 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            {totalPnLPercentage >= 0 ? '+' : ''}{totalPnLPercentage.toFixed(2)}% vs invested capital
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioAnalytics;
