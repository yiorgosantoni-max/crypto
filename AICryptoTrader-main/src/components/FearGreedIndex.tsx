
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp } from "lucide-react";

const fetchFearGreedIndex = async () => {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    if (!response.ok) throw new Error('Failed to fetch fear and greed index');
    return response.json();
  } catch (error) {
    // Fallback to mock data if API fails
    return {
      data: [{
        value: "64",
        value_classification: "Greed"
      }]
    };
  }
};

const FearGreedIndex = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['fearGreedIndex'],
    queryFn: fetchFearGreedIndex,
    refetchInterval: 3600000, // 1 hour
  });

  const indexValue = parseInt(data?.data?.[0]?.value || "64");
  const classification = data?.data?.[0]?.value_classification || "Greed";

  const getColor = (value: number) => {
    if (value <= 25) return "text-red-500";
    if (value <= 45) return "text-orange-500";
    if (value <= 55) return "text-yellow-500";
    if (value <= 75) return "text-green-500";
    return "text-green-400";
  };

  const getBackgroundColor = (value: number) => {
    if (value <= 25) return "from-red-500/20 to-red-600/20";
    if (value <= 45) return "from-orange-500/20 to-orange-600/20";
    if (value <= 55) return "from-yellow-500/20 to-yellow-600/20";
    if (value <= 75) return "from-green-500/20 to-green-600/20";
    return "from-green-400/20 to-green-500/20";
  };

  return (
    <Card className={`bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-800 hover:border-red-500/30 transition-all duration-300`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">Fear & Greed Index</CardTitle>
        <Brain className="h-4 w-4 text-red-500" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getColor(indexValue)}`}>
                {indexValue}
              </div>
              <div className={`text-lg font-semibold ${getColor(indexValue)}`}>
                {classification}
              </div>
            </div>
            
            {/* Visual indicator */}
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`bg-gradient-to-r ${getBackgroundColor(indexValue)} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${indexValue}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Extreme Fear</span>
                <span>Extreme Greed</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Market sentiment indicator based on volatility, momentum, and social media
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FearGreedIndex;
