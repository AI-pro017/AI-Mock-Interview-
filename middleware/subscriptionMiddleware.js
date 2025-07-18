import { SubscriptionService } from '@/utils/subscriptionService';

export async function checkSubscriptionLimits(userId, sessionType) {
  const canStart = await SubscriptionService.canStartSession(userId, sessionType);
  
  if (!canStart.canStart) {
    return {
      allowed: false,
      reason: canStart.reason,
      subscription: null,
      usage: null
    };
  }

  return {
    allowed: true,
    subscription: canStart.subscription,
    usage: canStart.usage
  };
}

export async function trackSessionUsage(userId, sessionType, sessionId, duration) {
  const subscription = await SubscriptionService.getUserSubscription(userId);
  if (!subscription) {
    return false;
  }

  return await SubscriptionService.trackUsage(
    userId,
    subscription.id,
    sessionType,
    sessionId,
    duration
  );
}
