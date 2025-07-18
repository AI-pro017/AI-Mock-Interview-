import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId, duration } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Update the existing session duration
        try {
            const { db } = await import('@/utils/db');
            const { usageTracking } = await import('@/utils/schema');
            const { eq, and } = await import('drizzle-orm');
            
            const result = await db
                .update(usageTracking)
                .set({
                    duration: Math.round(duration / 60) // Convert to minutes
                })
                .where(
                    and(
                        eq(usageTracking.userId, session.user.id),
                        eq(usageTracking.sessionId, sessionId),
                        eq(usageTracking.sessionType, 'real_time_help')
                    )
                );
            
            console.log(`✅ Updated copilot session duration for user ${session.user.id}, session ${sessionId}, duration: ${Math.round(duration / 60)} minutes`);
            
            return NextResponse.json({ 
                success: true,
                message: 'Session duration updated successfully'
            });
        } catch (error) {
            console.error('Error updating copilot session duration:', error);
            return NextResponse.json({ 
                success: false,
                message: 'Failed to update session duration'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in copilot update-usage endpoint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 