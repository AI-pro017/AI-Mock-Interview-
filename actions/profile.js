"use server";

import { auth } from "@/auth"; // Your NextAuth.js config
import { db } from "@/utils/db";
import { UserProfile, WorkHistory, Education, Certifications } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(formData) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Not authenticated" };
  }

  const userEmail = session.user.email;

  try {
    // Step 1: Upsert the main profile data
    // This will create the profile if it doesn't exist, or update it if it does.
    const [userProfile] = await db
      .insert(UserProfile)
      .values({
        email: userEmail,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        professionalTitle: formData.professionalTitle,
        locationCity: formData.location?.city,
        locationCountry: formData.location?.country,
        yearsOfExperience: formData.yearsOfExperience,
        professionalSummary: formData.professionalSummary,
        skills: formData.skills?.join(', '), // Join skills array into a string
        hobbiesInterests: formData.hobbiesInterests, // Store as a simple string
      })
      .onConflictDoUpdate({
        target: UserProfile.email,
        set: {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          professionalTitle: formData.professionalTitle,
          locationCity: formData.location?.city,
          locationCountry: formData.location?.country,
          yearsOfExperience: formData.yearsOfExperience,
          professionalSummary: formData.professionalSummary,
          skills: formData.skills?.join(', '),
          hobbiesInterests: formData.hobbiesInterests, // Store as a simple string
        },
      })
      .returning();

    const userProfileId = userProfile.id;

    // Step 2: Handle Work History (Delete all then re-insert)
    await db.delete(WorkHistory).where(eq(WorkHistory.userProfileId, userProfileId));
    if (formData.workHistory?.length > 0) {
      await db.insert(WorkHistory).values(
        formData.workHistory.map(item => ({ ...item, userProfileId }))
      );
    }

    // Step 3: Handle Education (Delete all then re-insert)
    await db.delete(Education).where(eq(Education.userProfileId, userProfileId));
    if (formData.education?.length > 0) {
      await db.insert(Education).values(
        formData.education.map(item => ({ ...item, userProfileId }))
      );
    }
    
    // Step 4: Handle Certifications (Delete all then re-insert)
    await db.delete(Certifications).where(eq(Certifications.userProfileId, userProfileId));
    if (formData.certifications?.length > 0) {
      await db.insert(Certifications).values(
        formData.certifications.map(item => ({ ...item, userProfileId }))
      );
    }

    revalidatePath("/dashboard/profile"); // Refresh the page data
    return { success: "Profile updated successfully!" };

  } catch (error) {
    console.error("Failed to update profile:", error);
    return { error: "Failed to update profile. Please try again." };
  }
} 