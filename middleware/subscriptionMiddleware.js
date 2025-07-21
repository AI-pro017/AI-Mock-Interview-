import { SubscriptionService } from '@/utils/subscriptionService';

export async function checkSubscriptionLimits(userId, sessionType) {
  const canStart = await SubscriptionService.canStartSession(userId, sessionType);
  
  if (!canStart.canStart) {
    return {
      allowed: false,
      reason: canStart.reason,
      subscription: canStart.subscription,
      usage: canStart.usage
    };
  }

  return {
    allowed: true,
    subscription: canStart.subscription,
    usage: canStart.usage
  };
}

export async function trackSessionUsage(userId, sessionType, sessionId, duration = 0) {
  console.log('🎯 trackSessionUsage called with:', { userId, sessionType, sessionId, duration });
  
  try {
    const result = await SubscriptionService.trackUsage(
      userId,
      sessionType,
      sessionId,
      duration
    );
    
    console.log('🎯 trackSessionUsage result:', result);
    return result;
  } catch (error) {
    console.error('🎯 trackSessionUsage error:', error);
    throw error;
  }
}
