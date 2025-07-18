"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, Crown, CheckCircle, XCircle, MessageSquare, Users, RefreshCw, Zap, Star, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubscriptionStatus() {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pathname = usePathname();

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscriptions/current');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  // Refresh subscription data when pathname changes
  useEffect(() => {
    if (!loading) {
      setRefreshing(true);
      fetchSubscriptionData();
    }
  }, [pathname]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptionData();
  };

  // Plan badge styling based on tier
  const getPlanBadgeStyle = (planName) => {
    switch (planName?.toLowerCase()) {
      case 'freemium':
        return {
          bg: 'bg-gray-600/80',
          text: 'text-gray-200',
          border: 'border-gray-500',
          icon: null,
          gradient: false
        };
      case 'starter':
        return {
          bg: 'bg-blue-600/80',
          text: 'text-blue-100',
          border: 'border-blue-400',
          icon: <Zap className="w-3 h-3" />,
          gradient: false
        };
      case 'pro':
        return {
          bg: 'bg-gradient-to-r from-purple-600/80 to-pink-600/80',
          text: 'text-white',
          border: 'border-purple-400',
          icon: <Star className="w-3 h-3" />,
          gradient: true
        };
      case 'unlimited':
        return {
          bg: 'bg-gradient-to-r from-amber-500/80 via-orange-500/80 to-red-500/80',
          text: 'text-white',
          border: 'border-amber-300',
          icon: <Crown className="w-3 h-3" />,
          gradient: true,
          premium: true
        };
      default:
        return {
          bg: 'bg-gray-600/80',
          text: 'text-gray-200',
          border: 'border-gray-500',
          icon: null,
          gradient: false
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <div className="w-16 h-6 bg-gray-600/50 rounded-full animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-600/50 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!subscriptionData?.subscription) {
    const freemiumStyle = getPlanBadgeStyle('freemium');
    return (
      <div className="flex items-center gap-4">
        {/* Freemium Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${freemiumStyle.bg} ${freemiumStyle.border} ${freemiumStyle.text}`}>
          <span className="text-xs font-semibold">Free</span>
        </div>
        
        <Link 
          href="/dashboard/upgrade" 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 border border-amber-400 text-amber-100 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25"
        >
          <Crown className="w-3 h-3" />
          <span className="text-xs font-semibold">Upgrade</span>
        </Link>
      </div>
    );
  }

  const { subscription, usage } = subscriptionData;
  const plan = subscription.plan;
  const planStyle = getPlanBadgeStyle(plan.name);
  
  // Calculate usage percentages
  const mockUsagePercent = plan.mockSessionsLimit 
    ? (usage.mock_interview.count / plan.mockSessionsLimit) * 100 
    : 0;
  
  const realtimeUsagePercent = plan.realTimeHelpLimit 
    ? (usage.real_time_help.count / plan.realTimeHelpLimit) * 100 
    : 0;

  // Determine status for current page
  const isCopilotPage = pathname.includes('/copilot');
  const isInterviewPage = pathname.includes('/interview') && !pathname.includes('/copilot');
  
  // Check limits based on current page
  const mockLimitReached = plan.mockSessionsLimit && usage.mock_interview.count >= plan.mockSessionsLimit;
  const realtimeLimitReached = plan.realTimeHelpLimit && usage.real_time_help.count >= plan.realTimeHelpLimit;
  
  const mockNearLimit = mockUsagePercent >= 80 && mockUsagePercent < 100;
  const realtimeNearLimit = realtimeUsagePercent >= 80 && realtimeUsagePercent < 100;

  const getStatusForCurrentPage = () => {
    if (isCopilotPage) {
      if (realtimeLimitReached) return { status: 'limit_reached', type: 'copilot' };
      if (realtimeNearLimit) return { status: 'near_limit', type: 'copilot' };
      return { status: 'ok', type: 'copilot' };
    } else if (isInterviewPage) {
      if (mockLimitReached) return { status: 'limit_reached', type: 'mock' };
      if (mockNearLimit) return { status: 'near_limit', type: 'mock' };
      return { status: 'ok', type: 'mock' };
    } else {
      // Dashboard or other pages - show overall status
      if (mockLimitReached || realtimeLimitReached) return { status: 'limit_reached', type: 'both' };
      if (mockNearLimit || realtimeNearLimit) return { status: 'near_limit', type: 'both' };
      return { status: 'ok', type: 'both' };
    }
  };

  const currentStatus = getStatusForCurrentPage();

  const getStatusIcon = () => {
    if (currentStatus.status === 'limit_reached') return <XCircle className="w-4 h-4 text-red-400" />;
    if (currentStatus.status === 'near_limit') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return null;
  };

  const getStatusText = () => {
    if (currentStatus.status === 'limit_reached') {
      if (currentStatus.type === 'copilot') return 'Copilot Limit Reached';
      if (currentStatus.type === 'mock') return 'Mock Interview Limit Reached';
      return 'Session Limits Reached';
    }
    if (currentStatus.status === 'near_limit') {
      if (currentStatus.type === 'copilot') return 'Copilot Near Limit';
      if (currentStatus.type === 'mock') return 'Mock Interview Near Limit';
      return 'Near Session Limits';
    }
    return null;
  };

  const getStatusColor = () => {
    if (currentStatus.status === 'limit_reached') return 'text-red-400';
    if (currentStatus.status === 'near_limit') return 'text-amber-400';
    return 'text-green-400';
  };

  const getUsageText = () => {
    if (isCopilotPage) {
      const used = usage.real_time_help.count;
      const limit = plan.realTimeHelpLimit;
      return limit ? `${used}/${limit} sessions` : 'Unlimited';
    } else if (isInterviewPage) {
      const used = usage.mock_interview.count;
      const limit = plan.mockSessionsLimit;
      return limit ? `${used}/${limit} sessions` : 'Unlimited';
    } else {
      // Show both on dashboard
      const mockUsed = usage.mock_interview.count;
      const mockLimit = plan.mockSessionsLimit;
      const realtimeUsed = usage.real_time_help.count;
      const realtimeLimit = plan.realTimeHelpLimit;
      
      return `${mockLimit ? `${mockUsed}/${mockLimit}` : '∞'} mock • ${realtimeLimit ? `${realtimeUsed}/${realtimeLimit}` : '∞'} copilot`;
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Premium Plan Badge */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${planStyle.bg} ${planStyle.border} ${planStyle.text} ${planStyle.premium ? 'shadow-lg shadow-amber-500/25' : ''} transition-all duration-200`}>
        {planStyle.icon}
        <span className="text-xs font-semibold">{plan.displayName}</span>
        {planStyle.premium && (
          <Sparkles className="w-3 h-3 animate-pulse" />
        )}
        {refreshing && (
          <RefreshCw className="w-3 h-3 animate-spin ml-1" />
        )}
      </div>

      {/* Status and Usage */}
      <div className="flex items-center gap-3">
        {/* Status Message */}
        {currentStatus.status !== 'ok' && (
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        )}

        {/* Usage Info */}
        <span className="text-sm text-gray-400">
          {getUsageText()}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {(currentStatus.status === 'limit_reached' || currentStatus.status === 'near_limit') && (
            <Link 
              href="/dashboard/upgrade" 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25"
            >
              <Crown className="w-3 h-3" />
              <span className="text-xs font-semibold">Upgrade</span>
            </Link>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-400 hover:text-gray-300 transition-colors p-1"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
} 