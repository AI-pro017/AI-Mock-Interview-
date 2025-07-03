import { auth } from "@/auth"
import { db } from "@/utils/db";
import { users } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { redirect } from 'next/navigation'
import ProfileCompletion from "../_components/ProfileCompletion";
import ProfileForm from "./_components/ProfileForm";

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/sign-in');
    }

    const userResult = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    const user = userResult[0];

    if (!user) {
        return <div className="p-8">User not found.</div>
    }

    return (
        <div className="p-8 bg-gray-900 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-6">Manage Your Profile</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    {/* The Profile Completion card will go here */}
                    <ProfileCompletion user={user} />
                </div>
                <div className="md:col-span-2">
                    {/* The main profile form will go here */}
                    <ProfileForm user={user} />
                </div>
            </div>
        </div>
    );
} 