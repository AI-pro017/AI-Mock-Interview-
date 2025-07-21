import { db } from './db';
import { subscriptionPlans, userSubscriptions, usageTracking } from './schema';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';

export class SubscriptionService {
  // Add the missing canStartSession method
  static async canStartSession(userId, sessionType) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return { 
          canStart: false, 
          reason: 'No subscription found',
          subscription: null,
          usage: null
        };
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
        return { 
          canStart: false, 
          reason: 'Invalid session type',
          subscription: null,
          usage: null
        };
      }

      // Check if unlimited (limit is -1 or null)
      if (limit === -1 || limit === null) {
        return { 
          canStart: true, 
          subscription,
          usage,
          reason: 'Unlimited plan'
        };
      }

      // Check if limit is reached
      if (used >= limit) {
        return { 
          canStart: false, 
          reason: `${sessionType} limit reached (${used}/${limit})`,
          subscription,
          usage
        };
      }

      return { 
        canStart: true, 
        subscription,
        usage,
        reason: `Within limits (${used}/${limit})`
      };
    } catch (error) {
      console.error('Error checking if can start session:', error);
      return { 
        canStart: false, 
        reason: 'Error checking limits',
        subscription: null,
        usage: null
      };
    }
  }

  // Add the missing createOrUpdateUserSubscription function
  static async createOrUpdateUserSubscription(userId, planId, subscriptionData) {
    try {
      // Check if user already has a subscription
      const existingSubscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .limit(1);

      if (existingSubscription[0]) {
        // Update existing subscription
        await db
          .update(userSubscriptions)
          .set({
            planId,
            stripeCustomerId: subscriptionData.customerId,
            stripeSubscriptionId: subscriptionData.subscriptionId,
            status: subscriptionData.status,
            currentPeriodStart: subscriptionData.currentPeriodStart,
            currentPeriodEnd: subscriptionData.currentPeriodEnd,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.userId, userId));
      } else {
        // Create new subscription
        await db.insert(userSubscriptions).values({
          userId,
          planId,
          stripeCustomerId: subscriptionData.customerId,
          stripeSubscriptionId: subscriptionData.subscriptionId,
          status: subscriptionData.status,
          currentPeriodStart: subscriptionData.currentPeriodStart,
          currentPeriodEnd: subscriptionData.currentPeriodEnd,
        });
      }

      return true;
    } catch (error) {
      console.error('Error creating/updating subscription:', error);
      return false;
    }
  }

  // Fix the getUserSubscription function ordering
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
        .orderBy(userSubscriptions.updatedAt) // Order by most recent update
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

  // Get user's usage for current billing period
  static async getUserUsage(userId, subscriptionId) {
    try {
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Get ALL usage for this user in the current billing month
      // regardless of subscription ID, because usage should accumulate
      // even if user upgrades mid-month from freemium to paid
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
            eq(usageTracking.billingMonth, currentMonth)
            // Remove subscription ID filtering - get all usage for current month
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

  // Update trackUsage method to include sessionId
  static async trackUsage(userId, sessionType, sessionId, duration = 0) {
    console.log('🔍 Starting trackUsage with params:', { userId, sessionType, sessionId, duration });
    
    try {
      // Test database connection first
      console.log('🔗 Testing database connection...');
      const testQuery = await db.select({ count: sql`count(*)` }).from(usageTracking);
      console.log('✅ Database connection OK, current usage records count:', testQuery[0]?.count);
      
      const subscription = await this.getUserSubscription(userId);
      console.log('📋 User subscription:', subscription);
      
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      console.log('📅 Current month:', currentMonth);

      // Use only the fields that exist in the actual database
      const insertData = {
        userId,
        subscriptionId: subscription?.id || null,
        sessionType,
        sessionId,
        duration,
        billingMonth: currentMonth,
        usedAt: new Date(),
      };

      console.log('💾 About to insert usage data:', insertData);

      const result = await db.insert(usageTracking).values(insertData);
      
      console.log('✅ Usage tracked successfully:', sessionType, 'for user', userId, 'session', sessionId);
      console.log('📊 Insert result:', result);
      
      // Verify the insert worked by querying back
      const verification = await db
        .select()
        .from(usageTracking)
        .where(
          and(
            eq(usageTracking.userId, userId),
            eq(usageTracking.sessionId, sessionId)
          )
        )
        .limit(1);
      
      console.log('🔍 Verification query result:', verification);
      
      return true;
    } catch (error) {
      console.error('❌ Error tracking usage:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
      });
      
      return false;
    }
  }

  // Update usage duration - use usedAt field instead of createdAt
  static async updateUsageDuration(userId, sessionType, duration, sessionStartTime) {
    try {
      console.log('🔄 Updating usage duration:', { userId, sessionType, duration });
      
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      // Find the most recent usage record for this session using usedAt
      const result = await db
        .update(usageTracking)
        .set({ 
          duration,
          // Don't try to update updatedAt since it doesn't exist
        })
        .where(
          and(
            eq(usageTracking.userId, userId),
            eq(usageTracking.sessionType, sessionType),
            eq(usageTracking.billingMonth, currentMonth),
            gte(usageTracking.usedAt, sessionStartTime) // Use usedAt instead of createdAt
          )
        );

      console.log('📊 Update result:', result);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error updating usage duration:', error);
      return false;
    }
  }
} 