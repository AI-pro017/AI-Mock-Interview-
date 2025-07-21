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

        // Update the existing session duration
        try {
            const { db } = await import('@/utils/db');
            const { usageTracking } = await import('@/utils/schema');
            const { eq, and } = await import('drizzle-orm');
            
            const result = await db
                .update(usageTracking)
                .set({
                    duration: Math.round(duration / 60), // Convert to minutes
                    updatedAt: new Date()
                })
                .where(
                    and(
                        eq(usageTracking.userId, session.user.id),
                        eq(usageTracking.sessionId, mockId),
                        eq(usageTracking.sessionType, 'mock_interview')
                    )
                );
            
            console.log(`✅ Updated mock interview session duration for user ${session.user.id}, session ${mockId}, duration: ${Math.round(duration / 60)} minutes`);
            
            return NextResponse.json({ 
                success: true,
                message: 'Session duration updated successfully'
            });
        } catch (error) {
            console.error('Error updating mock interview session duration:', error);
            return NextResponse.json({ 
                success: false,
                message: 'Failed to update session duration'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in interview update-usage endpoint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 