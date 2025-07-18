"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, X, Zap, Clock, Users, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UpgradeModal({ isOpen, onClose, currentPlan, reason }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const plans = [
    {
      name: 'starter',
      displayName: 'Starter',
      price: '$50',
      mockSessions: '8/month',
      realTimeHelp: '8/month',
      duration: '30/60 min',
      features: [
        '8 Mock Interview Sessions',
        '8 Real-Time Help Sessions',
        '30 min mock, 60 min real-time',
        'Advanced AI Feedback',
        'Progress Tracking'
      ],
      popular: false,
    },
    {
      name: 'pro',
      displayName: 'Pro',
      price: '$65',
      mockSessions: '12/month',
      realTimeHelp: '10/month',
      duration: '30/90 min',
      features: [
        '12 Mock Interview Sessions',
        '10 Real-Time Help Sessions',
        '30 min mock, 90 min real-time',
        'Premium AI Analysis',
        'Custom Interview Scenarios',
        'Detailed Performance Reports'
      ],
      popular: true,
    },
    {
      name: 'unlimited',
      displayName: 'Unlimited',
      price: '$99',
      mockSessions: 'Unlimited',
      realTimeHelp: 'Unlimited',
      duration: 'Unlimited',
      features: [
        'Unlimited Mock Interviews',
        'Unlimited Real-Time Help',
        'No time restrictions',
        'Expert-Level AI Coaching',
        'Personal Interview Coach',
        'White-glove Support'
      ],
      popular: false,
    },
  ];

  const handleUpgrade = async (planName) => {
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
        alert(error.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllPlans = () => {
    onClose();
    router.push('/dashboard/upgrade');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="w-6 h-6 text-amber-400" />
            Upgrade Required
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {reason || 'You\'ve reached your plan limit. Upgrade to continue using our services.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-lg border ${
                  plan.popular 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-white">{plan.displayName}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
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
                    <span>{plan.duration}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-start text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={loading}
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-primary hover:bg-primary/90' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {loading ? 'Processing...' : `Choose ${plan.displayName}`}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <Button variant="outline" onClick={handleViewAllPlans} className="border-gray-600 text-gray-300 hover:bg-gray-800">
              View All Plans & Features
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}