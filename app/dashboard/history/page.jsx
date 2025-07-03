import { auth } from "@/auth"
import { db } from "@/utils/db";
import { users, MockInterview, InterviewReport } from "@/utils/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from 'next/navigation';
import InterviewHistoryClient from "./InterviewHistoryClient";

async function InterviewHistoryPage() {
    const session = await auth();
    if (!session?.user) {
        redirect('/api/auth/signin');
    }

    // Fetch user details
    const userResult = await db.select().from(users).where(eq(users.id, session.user.id));
    const user = userResult[0];

    if (!user) {
        console.error("User from session not found in DB, redirecting to sign-in.");
        redirect('/api/auth/signin');
    }

    // Fetch interviews and join with reports to get scores
    const interviewsWithScores = await db.select({
      interview: MockInterview,
      report: InterviewReport
    })
    .from(MockInterview)
    .leftJoin(InterviewReport, eq(MockInterview.mockId, InterviewReport.mockIdRef))
    .where(eq(MockInterview.createdBy, session.user.email))
    .orderBy(desc(MockInterview.id));

    const interviews = interviewsWithScores.map(result => ({
      ...result.interview,
      overallScore: result.report?.overallScore
    }));

    return (
        <InterviewHistoryClient user={user} interviews={interviews} />
    )
}

export default InterviewHistoryPage; 