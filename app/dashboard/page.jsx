// app/dashboard/page.jsx
"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import DashboardClient from "./DashboardClient";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const [interviews, setInterviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchInterviews() {
            if (status === 'authenticated') {
                try {
                    // Fetch interviews from the correct API endpoint
                    const response = await fetch('/api/interview-history');
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Sort interviews by createdAt in descending order (newest first)
                        const sortedData = [...data].sort((a, b) => {
                            // Parse dates and compare
                            const dateA = new Date(a.createdAt);
                            const dateB = new Date(b.createdAt);
                            return dateB - dateA;
                        });
                        
                        setInterviews(sortedData || []);
                    }
                } catch (error) {
                    console.error("Error fetching interviews:", error);
                    setInterviews([]);
                } finally {
                    setIsLoading(false);
                }
            } else if (status !== 'loading') {
                setIsLoading(false);
            }
        }

        fetchInterviews();
    }, [status]);

    if (status === 'loading' || isLoading) {
        return <div className="p-8 text-center">Loading your dashboard...</div>;
    }

    // Just pass the DashboardClient component with user and interviews data
    return <DashboardClient user={session?.user} interviews={interviews} />;
}
