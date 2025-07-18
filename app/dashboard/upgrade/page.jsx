'use client';

import { useState, useEffect } from 'react';
import { Check, Star, Clock, MessageSquare, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const UpgradePage = () => {
  // Change from single loading state to individual loading states
  const [loadingPlan, setLoadingPlan] = useState(null); // Track which plan is loading
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const { toast } = useToast();

  const plans = [
    {
      name: 'freemium',
      displayName: 'Freemium',
      price: '$0',
      priceSuffix: '/ month',
      description: 'Perfect for getting started with AI interview preparation.',
      mockSessions: '2 total',
      realTimeHelp: '2 total',
      maxDuration: '10 min (both)',
      features: [
        '2 Mock Interview Sessions',
        '2 Real-Time Help Sessions',
        '10 minutes per session',
        'Basic AI Feedback',
        'Standard Question Bank',
      ],
      cta: 'Current Plan',
      popular: false,
      isFreemium: true,
    },
    {
      name: 'starter',
      displayName: 'Starter',
      price: '$50',
      priceSuffix: '/ month',
      description: 'Great for regular practice and skill improvement.',
      mockSessions: '8/month',
      realTimeHelp: '8/month',
      maxDuration: '30 min (mock), 60 min (real-time)',
      features: [
        '8 Mock Interview Sessions per month',
        '8 Real-Time Help Sessions per month',
        '30 min mock sessions, 60 min real-time',
        'Advanced AI Feedback',
        'Performance Analytics',
        'Email Support',
      ],
      cta: 'Choose Starter',
      popular: false,
    },
    {
      name: 'pro',
      displayName: 'Pro',
      price: '$65',
      priceSuffix: '/ month',
      description: 'Perfect for serious interview preparation.',
      mockSessions: '12/month',
      realTimeHelp: '10/month',
      maxDuration: '30 min (mock), 90 min (real-time)',
      features: [
        '12 Mock Interview Sessions per month',
        '10 Real-Time Help Sessions per month',
        '30 min mock, 90 min real-time sessions',
        'Premium AI Feedback',
        'Advanced Performance Analytics',
        'Priority Email Support',
        'Custom Question Banks',
      ],
      cta: 'Choose Pro',
      popular: true,
    },
    {
      name: 'unlimited',
      displayName: 'Unlimited',
      price: '$99',
      priceSuffix: '/ month',
      description: 'For professionals who want unlimited access.',
      mockSessions: 'Unlimited',
      realTimeHelp: 'Unlimited',
      maxDuration: 'Unlimited',
      features: [
        'Unlimited Mock Interview Sessions',
        'Unlimited Real-Time Help Sessions',
        'Unlimited session duration',
        'Premium AI Feedback with detailed insights',
        'Comprehensive Performance Analytics',
        'Priority Support',
        'Custom Question Banks',
        'Detailed Performance Reports',
        'Priority Support',
      ],
      cta: 'Go Unlimited',
      popular: false,
    },
  ];

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.subscription);
        setUsage(data.usage);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleUpgrade = async (planName) => {
    if (planName === 'freemium') {
      toast({
        title: "Already on Freemium",
        description: "You're currently on the free plan.",
      });
      return;
    }

    // Set loading state for specific plan
    setLoadingPlan(planName);
    
    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planName }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const errorData = await response.json();
        toast({
          title: "Upgrade Failed",
          description: errorData.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      toast({
        title: "Upgrade Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clear loading state
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planName) => {
    const currentPlanName = currentSubscription?.plan?.name || 'freemium';
    return currentPlanName === planName;
  };

  // Check if a specific plan is loading
  const isPlanLoading = (planName) => {
    return loadingPlan === planName;
  };

  const getUsageText = (sessionType) => {
    if (!usage || !currentSubscription) return '';
    
    const usageData = usage[sessionType];
    const limits = currentSubscription.plan;
    
    if (sessionType === 'mock_interview') {
      if (limits.mockSessionsLimit === null) return 'Unlimited';
      return `${usageData.count}/${limits.mockSessionsLimit} used`;
    } else if (sessionType === 'real_time_help') {
      if (limits.realTimeHelpLimit === null) return 'Unlimited';
      return `${usageData.count}/${limits.realTimeHelpLimit} used`;
    }
    
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-400 mb-8">
            Unlock your interview potential with our AI-powered platform
          </p>
          
          {currentSubscription && (
            <div className="inline-flex items-center bg-gray-800 rounded-full px-4 py-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Currently on <span className="font-semibold ml-1">{currentSubscription.plan?.displayName || 'Freemium'}</span> plan
              {usage && (
                <div className="ml-4 text-gray-400">
                  {usage.mock_interview?.count || 0} mock interviews, {usage.real_time_help?.count || 0} real-time sessions used this month
                </div>
              )}
            </div>
          )}
        </header>

        {/* Subscription Comparison Table */}
        <div className="mb-12 overflow-x-auto">
          <table className="w-full bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Plan</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200">Mock Sessions</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200">Real-Time Help</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200">Max Duration</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200">Price/month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {plans.map((plan, index) => (
                <tr key={plan.name} className={`${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} ${isCurrentPlan(plan.name) ? 'ring-2 ring-primary' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="font-medium text-white">{plan.displayName}</span>
                      {plan.popular && (
                        <Badge className="ml-2 bg-primary text-primary-foreground">Most Popular</Badge>
                      )}
                      {isCurrentPlan(plan.name) && (
                        <Badge className="ml-2 bg-green-600 text-white">Current</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-300">{plan.mockSessions}</td>
                  <td className="px-6 py-4 text-center text-gray-300">{plan.realTimeHelp}</td>
                  <td className="px-6 py-4 text-center text-gray-300">{plan.maxDuration}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-white">{plan.price}</span>
                    {plan.priceSuffix && <span className="text-gray-400 text-sm">{plan.priceSuffix}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {plans.map((plan) => (
            <Card key={plan.name} className={`flex flex-col h-full bg-gray-800 border-gray-700 ${plan.popular ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''} ${isCurrentPlan(plan.name) ? 'ring-2 ring-green-500' : ''}`}>
              {plan.popular && (
                <div className="bg-primary text-primary-foreground py-1 px-4 text-sm font-semibold rounded-t-lg -mb-px flex items-center justify-center">
                  <Star className="w-4 h-4 mr-2" />
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">{plan.displayName}</CardTitle>
                <div className="text-4xl font-bold text-white">
                  {plan.price}
                  <span className="text-lg font-normal text-gray-400">{plan.priceSuffix}</span>
                </div>
                <CardDescription className="text-gray-400">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div className="flex items-center text-gray-300 text-sm">
                    <MessageSquare className="w-4 h-4 mr-2 text-blue-400" />
                    <span>{plan.mockSessions}</span>
                  </div>
                  <div className="flex items-center text-gray-300 text-sm">
                    <Users className="w-4 h-4 mr-2 text-green-400" />
                    <span>{plan.realTimeHelp}</span>
                  </div>
                  <div className="flex items-center text-gray-300 text-sm">
                    <Clock className="w-4 h-4 mr-2 text-purple-400" />
                    <span>{plan.maxDuration}</span>
                  </div>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button 
                  className="w-full" 
                  size="lg" 
                  variant={plan.popular ? 'default' : plan.isFreemium ? 'outline' : 'secondary'}
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={isPlanLoading(plan.name) || isCurrentPlan(plan.name)}
                >
                  {isPlanLoading(plan.name) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    isCurrentPlan(plan.name) ? 'Current Plan' : plan.cta
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>All prices are in USD. You can cancel your subscription at any time.</p>
          <p className="mt-2">Need help choosing? <a href="#" className="text-primary hover:underline">Contact our support team</a></p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage; 