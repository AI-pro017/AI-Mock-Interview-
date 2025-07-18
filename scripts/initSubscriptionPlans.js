const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { pgTable, serial, varchar, integer, decimal, boolean, timestamp, text } = require('drizzle-orm/pg-core');
const { eq } = require('drizzle-orm');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Define the subscription plans table schema directly
const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  mockSessionsLimit: integer('mock_sessions_limit'),
  realTimeHelpLimit: integer('real_time_help_limit'),
  mockSessionDuration: integer('mock_session_duration'),
  realTimeHelpDuration: integer('real_time_help_duration'),
  features: text('features'),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Initialize database connection
const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
const db = drizzle(sql);

const plans = [
  {
    name: 'freemium',
    displayName: 'Freemium',
    price: '0',
    mockSessionsLimit: 2,
    realTimeHelpLimit: 2,
    mockSessionDuration: 10,
    realTimeHelpDuration: 10,
    features: JSON.stringify([
      '2 Mock Interview Sessions',
      '2 Real-Time Help Sessions',
      '10 minutes per session',
      'Basic AI Feedback',
      'Standard Question Bank'
    ]),
    stripePriceId: null,
    isActive: true,
  },
  {
    name: 'starter',
    displayName: 'Starter',
    price: '50',
    mockSessionsLimit: 8,
    realTimeHelpLimit: 8,
    mockSessionDuration: 30,
    realTimeHelpDuration: 60,
    features: JSON.stringify([
      '8 Mock Interview Sessions per month',
      '8 Real-Time Help Sessions per month',
      '30 min mock sessions, 60 min real-time',
      'Advanced AI Feedback',
      'Industry-Specific Questions',
      'Progress Tracking'
    ]),
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    isActive: true,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    price: '65',
    mockSessionsLimit: 12,
    realTimeHelpLimit: 10,
    mockSessionDuration: 30,
    realTimeHelpDuration: 90,
    features: JSON.stringify([
      '12 Mock Interview Sessions per month',
      '10 Real-Time Help Sessions per month',
      '30 min mock, 90 min real-time sessions',
      'Premium AI Analysis',
      'Custom Interview Scenarios',
      'Detailed Performance Reports',
      'Priority Support'
    ]),
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    isActive: true,
  },
  {
    name: 'unlimited',
    displayName: 'Unlimited',
    price: '99',
    mockSessionsLimit: null,
    realTimeHelpLimit: null,
    mockSessionDuration: null,
    realTimeHelpDuration: null,
    features: JSON.stringify([
      'Unlimited Mock Interview Sessions',
      'Unlimited Real-Time Help Sessions',
      'No time restrictions',
      'Expert-Level AI Coaching',
      'Personal Interview Coach',
      'Custom Company Preparation',
      'White-glove Support',
      'API Access'
    ]),
    stripePriceId: process.env.STRIPE_UNLIMITED_PRICE_ID,
    isActive: true,
  },
];

async function initPlans() {
  try {
    console.log('🚀 Initializing subscription plans...');
    console.log('📊 Database URL:', process.env.NEXT_PUBLIC_DRIZZLE_DB_URL ? 'Connected' : 'Missing');
    
    for (const plan of plans) {
      try {
        console.log(`📝 Processing plan: ${plan.displayName}...`);
        
        // Try to insert the plan
        await db.insert(subscriptionPlans).values(plan);
        console.log(`✅ Added plan: ${plan.displayName}`);
        
      } catch (error) {
        if (error.message.includes('duplicate key') || 
            error.message.includes('UNIQUE constraint') ||
            error.message.includes('already exists')) {
          
          // Plan already exists, update it
          console.log(`🔄 Plan ${plan.displayName} exists, updating...`);
          
          await db.update(subscriptionPlans)
            .set({
              displayName: plan.displayName,
              price: plan.price,
              mockSessionsLimit: plan.mockSessionsLimit,
              realTimeHelpLimit: plan.realTimeHelpLimit,
              mockSessionDuration: plan.mockSessionDuration,
              realTimeHelpDuration: plan.realTimeHelpDuration,
              features: plan.features,
              stripePriceId: plan.stripePriceId,
              isActive: plan.isActive,
              updatedAt: new Date(),
            })
            .where(eq(subscriptionPlans.name, plan.name));
            
          console.log(`✅ Updated existing plan: ${plan.displayName}`);
        } else {
          console.error(`❌ Error with plan ${plan.displayName}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 Subscription plans initialized successfully!');
    
    // Verify the plans were created
    console.log('\n📋 Verifying created plans...');
    const createdPlans = await db.select().from(subscriptionPlans);
    createdPlans.forEach(plan => {
      console.log(`✓ ${plan.displayName} - $${plan.price}/month`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing subscription plans:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Check if required environment variables are set
if (!process.env.NEXT_PUBLIC_DRIZZLE_DB_URL) {
  console.error('❌ Missing NEXT_PUBLIC_DRIZZLE_DB_URL environment variable');
  process.exit(1);
}

initPlans();