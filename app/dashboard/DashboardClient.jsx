'use client'; // This component is now explicitly a client component

import React from 'react'
import AddNewInterview from './_components/AddNewInterview'
import InterviewList from './_components/InterviewList'
import ProfileCompletion from './_components/ProfileCompletion'
import PerformanceSnapshot from './_components/PerformanceSnapshot'
import UpgradeTeaser from './_components/UpgradeTeaser'
import Link from 'next/link'

function DashboardClient({ user, interviews }) { // Receive user data as a prop

  const isProfileComplete = user && user.experienceLevel && user.targetRoles && user.timezone;

  return (
    <div className='p-10'>
      <h1 className="text-3xl font-bold text-gray-800">
        Welcome back, {user?.name?.split(' ')[0] || 'User'}!
      </h1>
      <p className="text-gray-500 mt-1">
        Ready to ace your next interview? Let's get started.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Main Content (Left Column) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Main call to action */}
          <AddNewInterview />
          
          {/* Recent Interview History */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Interviews</h2>
            <InterviewList interviews={interviews} limit={3} />
          </div>
        </div>

        {/* Sidebar Widgets (Right Column) */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Profile Completion */}
          <ProfileCompletion user={user} />
          
          {/* Performance Snapshot */}
          <PerformanceSnapshot />

          {/* Upgrade Teaser */}
          <UpgradeTeaser />
        </div>
      </div>
    </div>
  )
}

export default DashboardClient 