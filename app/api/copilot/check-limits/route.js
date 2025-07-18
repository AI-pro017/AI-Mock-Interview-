import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check subscription limits for real-time help
        try {
            const { checkSubscriptionLimits } = await import('@/middleware/subscriptionMiddleware');
            const subscriptionCheck = await checkSubscriptionLimits(session.user.id, 'real_time_help');
            
            if (!subscriptionCheck.allowed) {
                return NextResponse.json({ 
                    allowed: false,
                    error: 'Subscription limit reached',
                    reason: subscriptionCheck.reason,
                    currentUsage: subscriptionCheck.currentUsage,
                    limit: subscriptionCheck.limit,
                    plan: subscriptionCheck.plan
                });
            }

            return NextResponse.json({ 
                allowed: true,
                currentUsage: subscriptionCheck.currentUsage,
                limit: subscriptionCheck.limit,
                plan: subscriptionCheck.plan
            });

        } catch (middlewareError) {
            console.error('Subscription middleware error:', middlewareError);
            // Allow access if middleware fails
            return NextResponse.json({ allowed: true });
        }

    } catch (error) {
        console.error('Error in copilot check-limits endpoint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 