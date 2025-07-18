import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Add this line to fix the dynamic server usage error
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
                    upgradeRequired: true
                }, { status: 403 });
            }

            return NextResponse.json({
                allowed: true,
                subscription: subscriptionCheck.subscription,
                usage: subscriptionCheck.usage
            });
        } catch (error) {
            console.error('Error checking copilot limits:', error);
            // If subscription service fails, allow usage (fallback)
            return NextResponse.json({
                allowed: true,
                subscription: null,
                usage: null
            });
        }

    } catch (error) {
        console.error('Error in copilot check-limits endpoint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 