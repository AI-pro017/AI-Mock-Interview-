// app/dashboard/page.jsx
"use client";
import React from "react";
import { useRouter } from "next/navigation";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewList from "./_components/InterviewList";

function Dashboard() {
  const router = useRouter();

  const handlePersonalityAnalysis = () => {
    router.push("/personality");
  };

  const handleFindJob = () => {
    router.push("/find-job");
  };

  return (
    <div className="p-10">
      <h2 className="font-bold text-2xl">Dashboard</h2>
      <h2 className="text-grey-500"> Create and Start your AI Mockup Interview </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 my-5">
        <AddNewInterview />
      </div>

      {/* Button Container with Flex Layout */}
      <div className="flex space-x-4 mt-5">
        {/* Personality Analysis Button */}
        <button
          onClick={handlePersonalityAnalysis}
          className="p-2 text-white rounded"
          style={{ backgroundColor: '#3f92b4' }}
        >
          Personality Analysis
        </button>

        {/* Find Job Button */}
        <button
          onClick={handleFindJob}
          className="p-2 text-black rounded"
          style={{ backgroundColor: '#FBEEC1' }}
        >
          Find Job
        </button>
      </div>

      {/* Previous Interview List */}
      <InterviewList />
    </div>
  );
}

export default Dashboard;
