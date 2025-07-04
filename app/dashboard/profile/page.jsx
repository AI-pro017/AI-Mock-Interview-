"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import ProfileForm from './_components/ProfileForm';
import ProfileCompletion from './_components/ProfileCompletion';
import dynamic from 'next/dynamic';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import ProfileCompletionStatic from './_components/ProfileCompletionStatic';
// import { getUserProfile, updateUserProfile } from '@/actions/profile'; // We will create this later

const fieldWeights = {
    fullName: 5,
    email: 5,
    phoneNumber: 5,
    location: 5,
    professionalTitle: 10,
    yearsOfExperience: 5,
    professionalSummary: 10,
    workHistory: 20,
    skills: 15,
    education: 10,
    certifications: 5,
    hobbiesInterests: 5
};

function calculateCompletion(data) {
    let total = 0;
    if (data.fullName) total += fieldWeights.fullName;
    if (data.email) total += fieldWeights.email;
    if (data.phoneNumber) total += fieldWeights.phoneNumber;
    if (data.location?.city || data.location?.country) total += fieldWeights.location;
    if (data.professionalTitle) total += fieldWeights.professionalTitle;
    if (data.yearsOfExperience) total += fieldWeights.yearsOfExperience;
    if (data.professionalSummary) total += fieldWeights.professionalSummary;
    if (data.workHistory?.length > 0) total += fieldWeights.workHistory;
    if (data.skills?.length > 0) total += fieldWeights.skills;
    if (data.education?.length > 0) total += fieldWeights.education;
    if (data.certifications?.length > 0) total += fieldWeights.certifications;
    if (data.hobbiesInterests) total += fieldWeights.hobbiesInterests;
    return total;
}

// Add a new server action to fetch user profile
async function fetchUserProfile(email) {
  const response = await fetch(`/api/profile?email=${encodeURIComponent(email)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }
  return response.json();
}

// Dynamically import ResumeUploader with SSR disabled
const ResumeUploader = dynamic(
  () => import('./_components/ResumeUploader'),
  { ssr: false }
);

function ProfilePage() {
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect loads the profile data from the database
    if (status === 'authenticated' && session?.user?.email) {
        setIsLoading(true);
        
        // Call API to fetch user profile data
        fetchUserProfile(session.user.email)
            .then(data => {
                // If we got data back, use it
                if (data) {
                    // Convert skills from string back to array if it exists
                    if (data.skills && typeof data.skills === 'string') {
                        data.skills = data.skills.split(',').map(skill => skill.trim()).filter(Boolean);
                    }

                    // Create location object from city and country
                    data.location = {
                        city: data.locationCity || '',
                        country: data.locationCountry || ''
                    };

                    // Delete separate location fields to avoid confusion
                    delete data.locationCity;
                    delete data.locationCountry;
                    
                    setProfileData(data);
                } else {
                    // If no data, initialize with user info from session
                    setProfileData({
                        fullName: session.user?.name || '',
                        email: session.user?.email || '',
                        phoneNumber: '',
                        location: { city: '', country: '' },
                        professionalTitle: '',
                        yearsOfExperience: '',
                        professionalSummary: '',
                        workHistory: [],
                        skills: [],
                        education: [],
                        certifications: [],
                        hobbiesInterests: ''
                    });
                }
                setIsLoading(false);
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
                // On error, initialize with empty data
                setProfileData({
                    fullName: session.user?.name || '',
                    email: session.user?.email || '',
                    phoneNumber: '',
                    location: { city: '', country: '' },
                    professionalTitle: '',
                    yearsOfExperience: '',
                    professionalSummary: '',
                    workHistory: [],
                    skills: [],
                    education: [],
                    certifications: [],
                    hobbiesInterests: ''
                });
                setIsLoading(false);
            });
    }
  }, [session, status]);

  const handleResumeData = (extractedData) => {
    setProfileData(prevData => ({
      ...prevData,
      ...extractedData,
      // Ensure arrays are not null
      workHistory: extractedData.workHistory || prevData.workHistory,
      skills: extractedData.skills || prevData.skills,
      education: extractedData.education || prevData.education,
      certifications: extractedData.certifications || prevData.certifications,
      hobbiesInterests: extractedData.hobbiesInterests || prevData.hobbiesInterests,
    }));
  };
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading your profile...</div>;
  }
  
  if (status === 'unauthenticated') {
      return <div>You must be signed in to view this page.</div>
    }

    return (
    <div className="p-4 md:p-10">
      <h2 className="font-bold text-3xl">Complete Your Profile</h2>
      <p className="text-slate-400">
        A complete profile helps our AI understand you better.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2">
            <ResumeUploader onDataExtracted={handleResumeData} />
            <ProfileForm 
                initialData={profileData} 
                onProfileUpdate={setProfileData}
            />
                </div>
        <div>
          <ProfileCompletionStatic percentage={calculateCompletion(profileData)} />
                </div>
            </div>
        </div>
    );
} 

export default ProfilePage; 