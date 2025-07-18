"use client";

import React, { useState, useEffect } from 'react';
import { Crown, Zap, Star, Sparkles, ArrowRight, Check, Users, Clock, MessageSquare } from 'lucide-react';
import Link from 'next/link';

function UpgradeTeaser() {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      // Use the same endpoint as the header component
      const response = await fetch('/api/subscriptions/current');
      if (response.ok) {
        const data = await response.json();
        console.log('UpgradeTeaser - Raw API Response:', data);
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planName) => {
    switch (planName?.toLowerCase()) {
      case 'pro':
        return <Star className="h-5 w-5" />;
      case 'unlimited':
        return <Crown className="h-5 w-5" />;
      case 'starter':
        return <Zap className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getPlanColors = (planName) => {
    switch (planName?.toLowerCase()) {
      case 'pro':
        return {
          bg: 'bg-gradient-to-br from-purple-900/50 to-pink-900/50',
          border: 'ring-purple-500/30',
          accent: 'text-purple-400',
          button: 'bg-purple-500 hover:bg-purple-600'
        };
      case 'unlimited':
        return {
          bg: 'bg-gradient-to-br from-yellow-900/50 to-orange-900/50',
          border: 'ring-yellow-500/30',
          accent: 'text-yellow-400',
          button: 'bg-yellow-500 hover:bg-yellow-600 text-black'
        };
      case 'starter':
        return {
          bg: 'bg-gradient-to-br from-blue-900/50 to-cyan-900/50',
          border: 'ring-blue-500/30',
          accent: 'text-blue-400',
          button: 'bg-blue-500 hover:bg-blue-600'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-900/50 to-slate-900/50',
          border: 'ring-gray-500/30',
          accent: 'text-gray-400',
          button: 'bg-amber-500 hover:bg-amber-600 text-black'
        };
    }
  };

  const getNextPlan = (currentPlan) => {
    switch (currentPlan?.toLowerCase()) {
      case 'freemium':
        return { name: 'Starter', price: '$50' };
      case 'starter':
        return { name: 'Pro', price: '$65' };
      case 'pro':
        return { name: 'Unlimited', price: '$99' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden ring-1 ring-gray-500/30 animate-pulse">
        <div className="p-6">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded mb-4"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Extract plan information using the same logic as header
  const { subscription, usage } = subscriptionData || {};
  const plan = subscription?.plan;
  
  // Use the same field as the header component (plan.name, not plan.displayName)
  const currentPlanName = plan?.name || 'freemium';
  const currentPlanDisplay = plan?.displayName || 'Freemium';
  
  console.log('UpgradeTeaser - Plan Data:', {
    planName: currentPlanName,
    planDisplay: currentPlanDisplay,
    fullPlan: plan
  });

  const planColors = getPlanColors(currentPlanName);
  const planIcon = getPlanIcon(currentPlanName);
  const nextPlan = getNextPlan(currentPlanName);

  return (
    <div className={`${planColors.bg} rounded-xl shadow-lg overflow-hidden ring-1 ${planColors.border} backdrop-blur-sm`}>
      <div className="p-6">
        {/* Current Plan Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`${planColors.accent}`}>
              {planIcon}
            </div>
            <h3 className={`text-lg font-semibold ${planColors.accent}`}>
              {currentPlanDisplay} Plan
            </h3>
          </div>
          {currentPlanName !== 'freemium' && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${planColors.accent} bg-white/10`}>
              Active
            </div>
          )}
        </div>

        {/* Usage Stats */}
        {usage && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <MessageSquare className="h-4 w-4" />
                <span>Mock Interviews</span>
              </div>
              <span className={`font-medium ${planColors.accent}`}>
                {usage.mock_interview?.count || 0}
                {plan?.mockSessionsLimit !== -1 && ` / ${plan?.mockSessionsLimit || 0}`}
                {plan?.mockSessionsLimit === -1 && ' / ∞'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-4 w-4" />
                <span>Real-Time Help</span>
              </div>
              <span className={`font-medium ${planColors.accent}`}>
                {usage.real_time_help?.count || 0}
                {plan?.realTimeHelpLimit !== -1 && ` / ${plan?.realTimeHelpLimit || 0}`}
                {plan?.realTimeHelpLimit === -1 && ' / ∞'}
              </span>
            </div>
          </div>
        )}

        {/* Plan Features */}
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-3">
            {currentPlanName === 'freemium' ? 'Current free features:' : 'Your plan includes:'}
          </p>
          
          <ul className="space-y-2">
            {currentPlanName === 'freemium' && (
              <>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  2 Mock Interview Sessions
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  2 Real-Time Help Sessions
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  10 minutes per session
                </li>
              </>
            )}
            {currentPlanName === 'starter' && (
              <>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  8 Mock Interviews/month
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  8 Real-Time Help/month
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  30-60 min sessions
                </li>
              </>
            )}
            {currentPlanName === 'pro' && (
              <>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  12 Mock Interviews/month
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  10 Real-Time Help/month
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  30-90 min sessions
                </li>
              </>
            )}
            {currentPlanName === 'unlimited' && (
              <>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Unlimited Everything
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Priority Support
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Advanced Analytics
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Upgrade Button */}
        {nextPlan ? (
          <Link href="/dashboard/upgrade">
            <button className={`w-full py-3 ${planColors.button} text-white rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 transform`}>
              <span>Upgrade to {nextPlan.name}</span>
              <span className="text-xs opacity-90">{nextPlan.price}/mo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        ) : (
          <div className="text-center py-3">
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <Crown className="h-5 w-5" />
              <span className="font-semibold">You have the best plan!</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Enjoy unlimited access to everything</p>
          </div>
        )}

        {/* View All Plans Link */}
        <div className="mt-3 text-center">
          <Link href="/dashboard/upgrade" className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
            View all plans & features →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default UpgradeTeaser; 