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
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Average Score</p>
            <p className="text-xl font-bold text-gray-800">{performanceData.averageScore}%</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Confidence Trend</p>
            <p className="text-lg font-semibold text-green-600 capitalize">Improving</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Star className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Top Skill</p>
            <p className="text-lg font-semibold text-gray-800">{performanceData.topSkill}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerformanceSnapshot; 