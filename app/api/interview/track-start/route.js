import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mockId, duration } = await req.json();

        if (!mockId) {
            return NextResponse.json({ error: 'Mock ID is required' }, { status: 400 });
        }

        // Track the actual session start
        try {
            const { trackSessionUsage } = await import('@/middleware/subscriptionMiddleware');
            await trackSessionUsage(session.user.id, 'mock_interview', mockId, duration || 0);
            
            console.log(`✅ Tracked mock interview session start for user ${session.user.id}, session ${mockId}`);
            
            return NextResponse.json({ 
                success: true,
                message: 'Session start tracked successfully'
            });
        } catch (error) {
            console.error('Error tracking session start:', error);
            return NextResponse.json({ 
                success: false,
                message: 'Failed to track session start'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in track-start endpoint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}