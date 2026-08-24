import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { fetchFearGreedIndex } from "@/services/marketDataService";

const FearGreedIndex = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fearGreedIndex'],
    queryFn: ({ signal }) => fetchFearGreedIndex(signal),
    refetchInterval: 3600000,
  });

  const indexValue = data?.value ?? 0;
  const classification = data?.value_classification ?? 'Unavailable';

  const getColor = (value: number) => {
    if (value <= 25) return "text-red-500";
    if (value <= 45) return "text-orange-500";
    if (value <= 55) return "text-yellow-500";
    if (value <= 75) return "text-green-500";
    return "text-green-400";
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-800 hover:border-red-500/30 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">Fear & Greed Index</CardTitle>
        <Brain className="h-4 w-4 text-red-500" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2"><div className="h-8 bg-gray-700 rounded animate-pulse" /><div className="h-4 bg-gray-700 rounded animate-pulse" /></div>
        ) : isError ? (
          <div className="py-8 text-center text-sm text-gray-500">Market sentiment is temporarily unavailable.</div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getColor(indexValue)}`}>{indexValue}</div>
              <div className={`text-lg font-semibold ${getColor(indexValue)}`}>{classification}</div>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${indexValue}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Extreme Fear</span><span>Extreme Greed</span></div>
            </div>
            <p className="text-xs text-gray-400 text-center">Source: Alternative.me Fear & Greed Index</p>
            <p className="text-xs text-gray-500 text-center">Updated {data ? new Date(data.timestamp).toLocaleTimeString() : '—'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FearGreedIndex;
