"use client"
import React, { useState, useEffect } from 'react'
import Header from './_components/Header'
import Sidebar from './_components/Sidebar'
import MobileNavigation from './_components/MobileNavigation'
import { usePathname } from 'next/navigation'
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/toaster"
import { ChevronRight } from 'lucide-react'

function DashboardLayout({ children }) {
    const pathname = usePathname();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    // Load sidebar state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState !== null) {
            setIsSidebarCollapsed(JSON.parse(savedState));
        }
    }, []);
    
    // Save sidebar state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
    }, [isSidebarCollapsed]);
    
    // Get the current page title based on pathname
    const getPageTitle = () => {
        if (pathname.includes('/profile')) return 'My Profile';
        if (pathname.includes('/interview-history')) return 'Mock Interview History';
        if (pathname.includes('/copilot')) return 'Interview Copilot';
        if (pathname.includes('/interview')) return 'New Mock Interview';
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
                <link rel="canonical" href={process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` : undefined} />
                {/* Unified top header bar */}
                <Header pageTitle={getPageTitle()} />
                
                {/* Content area with sidebar */}
                <div className="flex">
                    <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
                    
                    {/* Show button when sidebar is collapsed */}
                    {isSidebarCollapsed && (
                        <button
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="hidden md:flex fixed left-0 bottom-20 z-[100] bg-gray-800 hover:bg-gray-700 text-white px-3 py-3 rounded-r-lg transition-all duration-300 items-center justify-center border-r border-t border-b border-gray-600 shadow-2xl hover:translate-x-1"
                            aria-label="Show sidebar"
                            title="Show sidebar"
                        >
                            <ChevronRight className="h-5 w-5 -mr-2" />
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    )}
                    
                    <div className={`w-full transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-0' : 'md:ml-64'} ${isInterviewHistoryPage() ? 'bg-[#0d1526]' : ''} pb-20 md:pb-0`}>
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