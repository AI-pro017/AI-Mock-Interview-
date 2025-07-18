'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      fetchSubscriptionData();
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscriptions/current');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSubscription = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/subscriptions/sync-stripe', {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Subscription Synced!",
          description: "Your subscription has been updated successfully.",
        });
        await fetchSubscriptionData();
        window.location.reload(); // Refresh to update header
      } else {
        throw new Error('Failed to sync subscription');
      }
    } catch (error) {
      console.error('Error syncing subscription:', error);
      toast({
        title: "Sync Failed",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Payment Successful!
          </CardTitle>
          <CardDescription className="text-gray-600">
            {subscription?.plan?.displayName 
              ? `Welcome to ${subscription.plan.displayName}! Your subscription is now active.`
              : "Your payment has been processed successfully."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!subscription?.plan && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-3">
                If your subscription doesn't appear immediately, please sync your account:
              </p>
              <Button 
                onClick={handleSyncSubscription}
                disabled={syncing}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Subscription
                  </>
                )}
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/interview">
                Start Mock Interview
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
