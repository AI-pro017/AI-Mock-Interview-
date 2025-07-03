import { BarChart, Star, TrendingUp } from 'lucide-react';

function PerformanceSnapshot() {
  // Placeholder data. This will be dynamic in the future.
  const performanceData = {
    averageScore: 78,
    confidenceTrend: 'up',
    topSkill: 'Communication',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Performance Snapshot</h2>
      
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-100 rounded-md">
            <BarChart className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Average Score</p>
            <div className="flex items-baseline gap-1">
              <p className="text-lg font-bold text-gray-800">{performanceData.averageScore}%</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="p-2 bg-green-100 rounded-md">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Confidence Trend</p>
            <p className="text-base font-medium text-green-600">Improving</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="p-2 bg-yellow-100 rounded-md">
            <Star className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Top Skill</p>
            <p className="text-base font-medium text-gray-800">{performanceData.topSkill}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerformanceSnapshot; 