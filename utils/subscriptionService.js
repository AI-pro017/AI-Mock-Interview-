import { db } from './db';
import { subscriptionPlans, userSubscriptions, usageTracking } from './schema';
import { eq, and, gte, lte, count, sql, desc } from 'drizzle-orm';

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

  // Updated to create new subscription records instead of updating
  static async createOrUpdateUserSubscription(userId, planId, subscriptionData) {
    try {
      // Always mark existing subscriptions as cancelled (preserve history)
      await db
        .update(userSubscriptions)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'active')
        ));

      // Always create new subscription record
      const newSubscription = await db.insert(userSubscriptions).values({
        userId,
        planId,
        stripeCustomerId: subscriptionData.customerId,
        stripeSubscriptionId: subscriptionData.subscriptionId,
        status: subscriptionData.status,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      console.log('✅ New subscription record created:', newSubscription[0].id);
      return newSubscription[0];
    } catch (error) {
      console.error('Error creating subscription:', error);
      return false;
    }
  }

  // Updated to get the latest active subscription
  static async getUserSubscription(userId) {
    try {
      const subscription = await db
        .select({
          id: userSubscriptions.id,
          status: userSubscriptions.status,
          currentPeriodStart: userSubscriptions.currentPeriodStart,
          currentPeriodEnd: userSubscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
          createdAt: userSubscriptions.createdAt,
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
        .where(and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'active')
        ))
        .orderBy(desc(userSubscriptions.createdAt)) // Get the most recent active subscription
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
          id: null, // No subscription record for freemium
          status: 'active',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          createdAt: null,
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
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  // Get subscription history for a user
  static async getUserSubscriptionHistory(userId) {
    try {
      const history = await db
        .select({
          id: userSubscriptions.id,
          status: userSubscriptions.status,
          createdAt: userSubscriptions.createdAt,
          updatedAt: userSubscriptions.updatedAt,
          currentPeriodStart: userSubscriptions.currentPeriodStart,
          currentPeriodEnd: userSubscriptions.currentPeriodEnd,
          plan: {
            id: subscriptionPlans.id,
            name: subscriptionPlans.name,
            displayName: subscriptionPlans.displayName,
            price: subscriptionPlans.price,
          }
        })
        .from(userSubscriptions)
        .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.userId, userId))
        .orderBy(desc(userSubscriptions.createdAt));

      return history;
    } catch (error) {
      console.error('Error getting subscription history:', error);
      return [];
    }
  }

  // Get revenue analytics from subscription history
  static async getRevenueAnalytics(startDate, endDate) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);

      // Get all subscription records in date range (excluding freemium)
      const subscriptions = await sql`
        SELECT 
          us.id,
          us.user_id,
          us.status,
          us.created_at,
          us.updated_at,
          sp.name as plan_name,
          sp.display_name as plan_display_name,
          sp.price
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.created_at >= ${startDate.toISOString()}
          AND us.created_at <= ${endDate.toISOString()}
          AND sp.name != 'freemium'
        ORDER BY us.created_at DESC
      `;

      // Calculate metrics
      const totalRevenue = subscriptions.reduce((sum, sub) => sum + parseFloat(sub.price || 0), 0);
      const totalSubscriptions = subscriptions.length;
      const uniqueUsers = new Set(subscriptions.map(sub => sub.user_id)).size;
      const avgRevenuePerUser = uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0;

      // Group by plan for breakdown
      const planBreakdown = subscriptions.reduce((acc, sub) => {
        const planName = sub.plan_display_name;
        if (!acc[planName]) {
          acc[planName] = { count: 0, revenue: 0 };
        }
        acc[planName].count++;
        acc[planName].revenue += parseFloat(sub.price || 0);
        return acc;
      }, {});

      return {
        totalRevenue,
        totalSubscriptions,
        uniqueUsers,
        avgRevenuePerUser,
        planBreakdown,
        subscriptions
      };
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      return {
        totalRevenue: 0,
        totalSubscriptions: 0,
        uniqueUsers: 0,
        avgRevenuePerUser: 0,
        planBreakdown: {},
        subscriptions: []
      };
    }
  }

  static async getUserUsage(userId, subscriptionId) {
    try {
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      const usage = await db
        .select({
          sessionType: usageTracking.sessionType,
          count: count(),
          totalDuration: sql`SUM(${usageTracking.duration})`,
        })
        .from(usageTracking)
        .where(
          and(
            eq(usageTracking.userId, userId),
            eq(usageTracking.billingMonth, currentMonth)
          )
        )
        .groupBy(usageTracking.sessionType);

      const result = {
        mock_interview: { count: 0, duration: 0 },
        real_time_help: { count: 0, duration: 0 },
      };

      usage.forEach(item => {
        if (item.sessionType === 'mock_interview') {
          result.mock_interview = {
            count: Number(item.count),
            duration: Number(item.totalDuration) || 0,
          };
        } else if (item.sessionType === 'real_time_help') {
          result.real_time_help = {
            count: Number(item.count),
            duration: Number(item.totalDuration) || 0,
          };
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting user usage:', error);
      return {
        mock_interview: { count: 0, duration: 0 },
        real_time_help: { count: 0, duration: 0 },
      };
    }
  }

  // Rest of the methods remain the same...
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

  static async trackUsage(userId, sessionType, sessionId, duration = 0) {
    console.log('🔍 Starting trackUsage with params:', { userId, sessionType, sessionId, duration });
    
    try {
      const subscription = await this.getUserSubscription(userId);
      console.log('📋 User subscription:', subscription);
      
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      console.log('📅 Current month:', currentMonth);

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
      
      return true;
    } catch (error) {
      console.error('❌ Error tracking usage:', error);
      return false;
    }
  }

  static async updateUsageDuration(userId, sessionType, duration, sessionStartTime) {
    try {
      console.log('🔄 Updating usage duration:', { userId, sessionType, duration });
      
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      const result = await db
        .update(usageTracking)
        .set({ 
          duration,
        })
        .where(
          and(
            eq(usageTracking.userId, userId),
            eq(usageTracking.sessionType, sessionType),
            eq(usageTracking.billingMonth, currentMonth),
            gte(usageTracking.usedAt, sessionStartTime)
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