// AI-Mock-Interview-/app/page.js
'use client'; // Add this if not already present, for using hooks like useState, useEffect

import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from "next/image";
import { BotMessageSquare, Speech, BarChart3, BrainCircuit } from 'lucide-react';
import { useEffect, useState } from "react"; // Import useEffect and useState

export default function Home() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // This ensures that the year is set on the client side after mounting,
    // aligning with what the client sees, thus avoiding mismatch with server render
    // if there was any discrepancy. For a static year, this complexity isn't strictly
    // needed, but it's a robust way to handle dynamic client-side values.
    setCurrentYear(new Date().getFullYear());
  }, []);

  const features = [
    {
      icon: <BotMessageSquare size={48} className="text-[#2c5f73] mb-4" />,
      title: "Realistic Interview Simulations",
      description: "Engage in mock interviews with AI-generated questions relevant to your desired job role and industry.",
    },
    {
      icon: <Speech size={48} className="text-[#2c5f73] mb-4" />,
      title: "Instant AI-Powered Feedback",
      description: "Receive immediate, detailed feedback on your answers, including content, delivery, and non-verbal cues.",
    },
    {
      icon: <BarChart3 size={48} className="text-[#2c5f73] mb-4" />,
      title: "Performance Analytics",
      description: "Track your progress over time with insightful analytics. Identify strengths and areas for improvement.",
    },
    {
      icon: <BrainCircuit size={48} className="text-[#2c5f73] mb-4" />,
      title: "Adaptive Learning",
      description: "Our AI adapts to your skill level, providing progressively challenging scenarios to boost your confidence.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa] text-gray-800">
      {/* Navigation Bar */}
      <nav className="w-full py-4 px-6 md:px-12 bg-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-[#2c5f73]">
            MockMate AI
          </Link>
          <div className="space-x-4">
            <Link href="/sign-in" passHref>
              <Button variant="ghost" className="text-[#2c5f73] hover:bg-[#e9ecef]">Sign In</Button>
            </Link>
            <Link href="/sign-up" passHref>
              <Button className="bg-[#2c5f73] text-white hover:bg-[#234d5f]">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="container mx-auto px-6 md:px-12 py-16 md:py-24 text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-[#2c5f73]">
            Ace Your Interviews with <span className="block md:inline">AI-Powered Practice</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl">
            MockMate AI provides realistic mock interviews and instant, personalized feedback to help you land your dream job.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/sign-up" passHref>
              <Button size="lg" className="bg-[#2c5f73] text-white hover:bg-[#234d5f] px-8 py-3 text-lg">
                Get Started For Free
              </Button>
            </Link>
            <Link href="#features" passHref>
              <Button size="lg" variant="outline" className="border-[#2c5f73] text-[#2c5f73] hover:bg-[#e9ecef] hover:text-[#2c5f73] px-8 py-3 text-lg">
                Learn More
              </Button>
            </Link>
          </div>
          <div className="mt-16">
            {/* Example: <Image src="/path-to-your-hero-image.svg" alt="AI Mock Interview" width={600} height={400} /> */}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-6 md:px-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2c5f73] mb-16 text-center">
              Why Choose MockMate AI?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {feature.icon}
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 md:px-12 bg-gray-800 text-white text-center">
        <div className="container mx-auto">
          <p>&copy; {currentYear} MockMate AI. All rights reserved.</p> {/* Use state variable here */}
          <p className="text-sm text-gray-400 mt-2">
            Your Personal AI Interview Copilot
          </p>
        </div>
      </footer>
    </div>
  );
}