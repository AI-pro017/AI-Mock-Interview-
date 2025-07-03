'use client'; // This component is now explicitly a client component

import React from 'react'
import StartInterviewButton from './_components/StartInterviewButton'
import InterviewList from './_components/InterviewList'
import ProfileCompletion from './_components/ProfileCompletion'
import PerformanceSnapshot from './_components/PerformanceSnapshot'
import UpgradeTeaser from './_components/UpgradeTeaser'
import { History } from 'lucide-react'
import Link from 'next/link'

function DashboardClient({ user, interviews }) { // Receive user data as a prop

  const isProfileComplete = user && user.experienceLevel && user.targetRoles && user.timezone;

  return (
    <div className='p-10 bg-slate-900 min-h-screen'>
      <h1 className="text-3xl font-bold text-slate-100">
        Welcome back, {user?.name?.split(' ')[0] || 'User'}!
      </h1>
      <p className="text-slate-400 mt-1 mb-8">
        Ready to ace your next interview? Let's get started.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (Left Column) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Main call to action - New clean button */}
          <StartInterviewButton />
          
          {/* Recent Interview History - self-contained component */}
          <InterviewList interviews={interviews} limit={6} />
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