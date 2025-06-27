// app/dashboard/page.jsx
import { auth } from "@/app/api/auth/[...auth]/route"
import { db } from "@/utils/db";
import { users, MockInterview } from "@/utils/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from 'next/navigation';
import DashboardClient from "./DashboardClient";

async function DashboardPage() {
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

    // Fetch interview history on the server
    const interviews = await db.select()
        .from(MockInterview)
        .where(eq(MockInterview.createdBy, session.user.email)) // Assumes createdBy uses email
        .orderBy(desc(MockInterview.id));

  return (
        <DashboardClient user={user} interviews={interviews} />
    )
}

export default DashboardPage;
