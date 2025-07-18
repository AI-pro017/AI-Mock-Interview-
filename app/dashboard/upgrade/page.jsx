'use client';

import { useState, useEffect } from 'react';
import { Check, Star, Clock, MessageSquare, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const UpgradePage = () => {
  const [loading, setLoading] = useState(false);
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
        'Industry-Specific Questions',
        'Progress Tracking',
      ],
      cta: 'Choose Starter',
      popular: false,
    },
    {
      name: 'pro',
      displayName: 'Pro',
      price: '$65',
      priceSuffix: '/ month',
      description: 'Best for serious interview preparation and career growth.',
      mockSessions: '12/month',
      realTimeHelp: '10/month',
      maxDuration: '30 min (mock), 90 min (real-time)',
      features: [
        '12 Mock Interview Sessions per month',
        '10 Real-Time Help Sessions per month',
        '30 min mock, 90 min real-time sessions',
        'Premium AI Analysis',
        'Custom Interview Scenarios',
        'Detailed Performance Reports',
        'Priority Support',
      ],
      cta: 'Choose Pro',
      popular: true,
    },
    {
      name: 'unlimited',
      displayName: 'Unlimited',
      price: '$99',
      priceSuffix: '/ month',
      description: 'Ultimate solution for intensive preparation and coaching.',
      mockSessions: 'Unlimited',
      realTimeHelp: 'Unlimited',
      maxDuration: 'Unlimited',
      features: [
        'Unlimited Mock Interview Sessions',
        'Unlimited Real-Time Help Sessions',
        'No time restrictions',
        'Expert-Level AI Coaching',
        'Personal Interview Coach',
        'Custom Company Preparation',
        'White-glove Support',
        'API Access',
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

    setLoading(true);
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
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create checkout session",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlan = (planName) => {
    return currentSubscription?.plan?.name === planName;
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
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Choose Your Perfect Plan
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Unlock advanced features and take your interview preparation to the next level.
          </p>
          {currentSubscription && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-300">
                Current Plan: <span className="font-semibold text-white">{currentSubscription.plan.displayName}</span>
              </p>
              <div className="mt-2 text-xs text-gray-400">
                <span className="mr-4">Mock Sessions: {getUsageText('mock_interview')}</span>
                <span>Real-Time Help: {getUsageText('real_time_help')}</span>
              </div>
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
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
                  {plan.displayName}
                  {isCurrentPlan(plan.name) && (
                    <Badge className="bg-green-600 text-white text-xs">Current</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-base font-medium text-gray-400">{plan.priceSuffix}</span>
                </div>
                
                {/* Quick Stats */}
                <div className="mb-6 space-y-2">
                  <div className="flex items-center text-sm text-gray-300">
                    <MessageSquare className="w-4 h-4 mr-2 text-blue-400" />
                    <span>{plan.mockSessions} mock sessions</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <Users className="w-4 h-4 mr-2 text-green-400" />
                    <span>{plan.realTimeHelp} real-time help</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
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
                  disabled={loading || isCurrentPlan(plan.name)}
                >
                  {loading ? (
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