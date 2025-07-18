import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId, duration } = await req.json();

        // Track the copilot session usage
        try {
            const { trackSessionUsage } = await import('@/middleware/subscriptionMiddleware');
            const trackingSessionId = sessionId || `copilot_${Date.now()}`;
            
            await trackSessionUsage(session.user.id, 'real_time_help', trackingSessionId, duration || 0);
            
            console.log(`✅ Tracked copilot session for user ${session.user.id}, session ${trackingSessionId}`);
            
            return NextResponse.json({ 
                success: true,
                message: 'Copilot usage tracked successfully'
            });
        } catch (error) {
            console.error('Error tracking copilot usage:', error);
            return NextResponse.json({ 
                success: false,
                message: 'Failed to track copilot usage'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in copilot track-usage endpoint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}