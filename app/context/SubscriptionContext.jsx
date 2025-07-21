"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    }
  };

  const refreshSubscriptionData = () => {
    console.log('🔄 Refreshing subscription data...');
    fetchSubscriptionData();
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      subscriptionData,
      loading,
      refreshSubscriptionData
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
} 