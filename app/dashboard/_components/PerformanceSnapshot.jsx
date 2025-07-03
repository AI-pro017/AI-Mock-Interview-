"use client"
import { useEffect, useState } from 'react';
import { BarChart, Star, TrendingUp, Zap, LineChart } from 'lucide-react';

function PerformanceSnapshot() {
  const [performanceData, setPerformanceData] = useState({
    topScore: 0,
    averageScore: 0,
    performanceTrend: 'neutral',
    topStrength: '',
    skillBreakdown: {},
    isLoading: true,
  });

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setPerformanceData(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await fetch('/api/performance-stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setPerformanceData({ ...data, isLoading: false });
    } catch (error) {
      setPerformanceData({ isLoading: false, error: error.message });
    }
  };

  const getTrendDisplay = () => {
    const trend = performanceData.performanceTrend?.toLowerCase() || '';
    if (trend.includes('improv')) return { text: 'Improving', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    if (trend.includes('declin')) return { text: 'Needs Work', color: 'text-amber-400', bgColor: 'bg-amber-500/20' };
    return { text: 'Steady', color: 'text-sky-400', bgColor: 'bg-sky-500/20' };
  };

  const renderStars = (score) => {
    const rating = Math.round(score / 20);
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
    ));
  };

  const trendDisplay = getTrendDisplay();
  const focusArea = performanceData.focusArea || 'Complete an interview for feedback.';

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-white/10">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <LineChart className="h-5 w-5 text-slate-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">Performance Insights</h2>
        </div>
        <button onClick={fetchPerformanceData} className="text-xs text-slate-400 hover:text-white" disabled={performanceData.isLoading}>
          {performanceData.isLoading ? '...' : 'Refresh'}
        </button>
      </div>

      {performanceData.isLoading ? (
        <div className="flex justify-center items-center h-56"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
      ) : performanceData.error || !performanceData.completedInterviews ? (
        <div className="text-center py-8">
          <p className="text-slate-300 mb-2">No performance data yet</p>
          <p className="text-sm text-slate-500">Complete an interview to see your stats.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4"><div className="p-2 bg-slate-700/50 rounded-md"><BarChart className="h-5 w-5 text-sky-400" /></div><div><p className="text-xs text-slate-400 mb-1">Top Score</p><div className="flex items-baseline gap-1.5"><p className="text-lg font-bold text-white">{`${performanceData.topScore}%`}</p><p className="text-xs text-slate-500">{`from ${performanceData.completedInterviews} interviews`}</p></div></div></div>
          <div className="flex items-center gap-4"><div className={`p-2 ${trendDisplay.bgColor} rounded-md`}><TrendingUp className={`h-5 w-5 ${trendDisplay.color}`} /></div><div><p className="text-xs text-slate-400 mb-1">Performance Trend</p><p className={`text-base font-medium ${trendDisplay.color}`}>{trendDisplay.text}</p></div></div>
          <div className="flex items-center gap-4"><div className="p-2 bg-yellow-500/20 rounded-md"><Star className="h-5 w-5 text-yellow-400" /></div><div><p className="text-xs text-slate-400 mb-1">Top Strength</p><p className="text-base font-medium text-white">{performanceData.topStrength}</p></div></div>
          <div className="flex items-center gap-4"><div className="p-2 bg-purple-500/20 rounded-md"><Zap className="h-5 w-5 text-purple-400" /></div><div><p className="text-xs text-slate-400 mb-1">Focus Area</p><p className="text-base font-medium text-white line-clamp-2">{focusArea}</p></div></div>
          {performanceData.skillBreakdown && <div className="pt-4 border-t border-slate-700/50"><p className="text-xs text-slate-400 mb-3">Skill Breakdown</p><div className="space-y-2">{Object.entries(performanceData.skillBreakdown).map(([skill, score]) => (<div key={skill} className="flex items-center justify-between"><span className="text-sm text-slate-300">{skill}</span><div className="flex items-center"><div className="w-28 h-1.5 bg-slate-700 rounded-full mr-2"><div className="h-1.5 bg-sky-400 rounded-full" style={{ width: `${score*10}%` }}></div></div><span className="text-xs font-medium text-slate-400">{score}/10</span></div></div>))}</div></div>}
          <div className="pt-4 border-t border-slate-700/50"><div className="flex flex-col items-center gap-2"><div className="flex">{renderStars(performanceData.averageScore)}</div><p className="text-xs text-slate-500">{`Average Score: ${performanceData.averageScore}%`}</p></div></div>
        </div>
      )}
    </div>
  );
}

export default PerformanceSnapshot;