import { db } from './db';
import { subscriptionPlans, userSubscriptions, usageTracking } from './schema';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';

export class SubscriptionService {
  // Get user's current subscription
  static async getUserSubscription(userId) {
    try {
      const subscription = await db
        .select({
          id: userSubscriptions.id,
          status: userSubscriptions.status,
          currentPeriodStart: userSubscriptions.currentPeriodStart,
          currentPeriodEnd: userSubscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
          plan: {
            id: subscriptionPlans.id,
            name: subscriptionPlans.name,
            displayName: subscriptionPlans.displayName,
            price: subscriptionPlans.price,
            mockSessionsLimit: subscriptionPlans.mockSessionsLimit,
            realTimeHelpLimit: subscriptionPlans.realTimeHelpLimit,
            mockSessionDuration: subscriptionPlans.mockSessionDuration,
            realTimeHelpDuration: subscriptionPlans.realTimeHelpDuration,
            features: subscriptionPlans.features,
          }
        })
        .from(userSubscriptions)
        .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.userId, userId))
        .orderBy(userSubscriptions.createdAt)
        .limit(1);

      // If user has an active subscription, return it
      if (subscription[0]) {
        return subscription[0];
      }

      // If no active subscription, return default Freemium plan
      const freemiumPlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, 'freemium'))
        .limit(1);

      if (freemiumPlan[0]) {
        return {
          id: null, // No subscription ID for freemium
          status: 'active',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          plan: {
            id: freemiumPlan[0].id,
            name: freemiumPlan[0].name,
            displayName: freemiumPlan[0].displayName,
            price: freemiumPlan[0].price,
            mockSessionsLimit: freemiumPlan[0].mockSessionsLimit,
            realTimeHelpLimit: freemiumPlan[0].realTimeHelpLimit,
            mockSessionDuration: freemiumPlan[0].mockSessionDuration,
            realTimeHelpDuration: freemiumPlan[0].realTimeHelpDuration,
            features: freemiumPlan[0].features,
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  // Create or update user subscription
  static async createOrUpdateSubscription(userId, planId, subscriptionData) {
    try {
      // Check if user already has a subscription
      const existingSubscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .limit(1);

      const subscriptionRecord = {
        userId,
        planId,
        stripeCustomerId: subscriptionData.customerId,
        stripeSubscriptionId: subscriptionData.subscriptionId,
        status: subscriptionData.status,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
        updatedAt: new Date(),
      };

      if (existingSubscription[0]) {
        // Update existing subscription
        await db
          .update(userSubscriptions)
          .set(subscriptionRecord)
          .where(eq(userSubscriptions.userId, userId));
      } else {
        // Create new subscription
        await db.insert(userSubscriptions).values({
          ...subscriptionRecord,
          createdAt: new Date(),
        });
      }

      return true;
    } catch (error) {
      console.error('Error creating/updating subscription:', error);
      return false;
    }
  }

  // Get user's usage for current billing period
  static async getUserUsage(userId, subscriptionId) {
    try {
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      const usage = await db
        .select({
          sessionType: usageTracking.sessionType,
          count: count(usageTracking.id),
          totalDuration: sql`COALESCE(SUM(${usageTracking.duration}), 0)`,
        })
        .from(usageTracking)
        .where(
          and(
            eq(usageTracking.userId, userId),
            // For freemium users (subscriptionId is null), get all their usage
            subscriptionId ? eq(usageTracking.subscriptionId, subscriptionId) : sql`1=1`,
            eq(usageTracking.billingMonth, currentMonth)
          )
        )
        .groupBy(usageTracking.sessionType);

      const usageMap = {
        mock_interview: { count: 0, totalDuration: 0 },
        real_time_help: { count: 0, totalDuration: 0 }
      };

      usage.forEach(item => {
        usageMap[item.sessionType] = {
          count: item.count,
          totalDuration: parseInt(item.totalDuration)
        };
      });

      return usageMap;
    } catch (error) {
      console.error('Error fetching user usage:', error);
      return {
        mock_interview: { count: 0, totalDuration: 0 },
        real_time_help: { count: 0, totalDuration: 0 }
      };
    }
  }

  // Check if user can perform an action based on their subscription limits
  static async checkSubscriptionLimits(userId, sessionType) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return { allowed: false, reason: 'No subscription found' };
      }

      const usage = await this.getUserUsage(userId, subscription.id);
      const plan = subscription.plan;

      let limit, used;
      
      if (sessionType === 'mock_interview') {
        limit = plan.mockSessionsLimit;
        used = usage.mock_interview.count;
      } else if (sessionType === 'real_time_help') {
        limit = plan.realTimeHelpLimit;
        used = usage.real_time_help.count;
      } else {
        return { allowed: false, reason: 'Invalid session type' };
      }

      if (limit === -1) { // Unlimited
        return { allowed: true, usage: { used, limit: 'unlimited' } };
      }

      if (used >= limit) {
        return { 
          allowed: false, 
          reason: `${sessionType} limit reached`, 
          usage: { used, limit },
          plan: plan.displayName
        };
      }

      return { 
        allowed: true, 
        usage: { used, limit },
        plan: plan.displayName
      };
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      return { allowed: false, reason: 'Error checking limits' };
    }
  }

  // Track usage
  static async trackUsage(userId, sessionType, duration = 0) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      await db.insert(usageTracking).values({
        userId,
        subscriptionId: subscription?.id || null, // Allow null for freemium users
        sessionType,
        duration,
        billingMonth: currentMonth,
        createdAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Error tracking usage:', error);
      return false;
    }
  }

  // Update usage duration
  static async updateUsageDuration(userId, sessionType, duration, sessionStartTime) {
    try {
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      // Find the most recent usage record for this session
      const result = await db
        .update(usageTracking)
        .set({ 
          duration,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(usageTracking.userId, userId),
            eq(usageTracking.sessionType, sessionType),
            eq(usageTracking.billingMonth, currentMonth),
            gte(usageTracking.createdAt, sessionStartTime)
          )
        );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error updating usage duration:', error);
      return false;
    }
  }
} 