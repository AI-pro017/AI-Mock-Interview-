"use client"
import React from 'react'
import Header from './_components/Header'
import Sidebar from './_components/Sidebar'
import MobileNavigation from './_components/MobileNavigation'
import { usePathname } from 'next/navigation'
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/toaster"

function DashboardLayout({ children }) {
    const pathname = usePathname();
    
    // Get the current page title based on pathname
    const getPageTitle = () => {
        if (pathname.includes('/profile')) return 'My Profile';
        if (pathname.includes('/interview-history')) return 'Interview History';
        if (pathname.includes('/copilot')) return 'Interview Copilot';
        if (pathname.includes('/interview')) return 'New Interview';
        if (pathname.includes('/upgrade')) return 'Upgrade';
        return 'Dashboard';
    };
    
    // Function to determine if we're on the interview history page
    const isInterviewHistoryPage = () => {
        return pathname.includes('/interview-history');
    };
    
    return (
        <SessionProvider>
            <div className="min-h-screen bg-[#0d1526]">
                {/* Unified top header bar */}
                <Header pageTitle={getPageTitle()} />
                
                {/* Content area with sidebar */}
                <div className="flex">
                    <Sidebar />
                    <div className={`w-full md:ml-64 ${isInterviewHistoryPage() ? 'bg-[#0d1526]' : ''} pb-20 md:pb-0`}>
                        {children}
                    </div>
                </div>
                
                {/* Mobile Navigation */}
                <MobileNavigation />
                
                <Toaster />
            </div>
        </SessionProvider>
    );
}

export default DashboardLayout