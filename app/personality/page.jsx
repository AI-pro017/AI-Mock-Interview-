// app/personality/page.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import questions from '../dashboard/_components/questions';
import { db } from '@/utils/db';
import { PersonalityFeedback } from '@/utils/schema';
import { useUser } from '@clerk/nextjs';

// Tell Next.js not to prerender this page
export const dynamic = 'force-dynamic';

// Create a component that will only render on the client
function PersonalityQuizContent() {
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const router = useRouter();
  const { user } = useUser();

  const handleAnswerChange = (answer, questionIndex) => {
    const updatedAnswers = [...answers];
    updatedAnswers[questionIndex] = answer;
    setAnswers(updatedAnswers);
  };

  const handleSubmit = async () => {
    if (answers.includes(null)) {
      alert('Please answer all questions before submitting.');
      return;
    }

    try {
      await Promise.all(
        questions.map((question, index) => 
          db.insert(PersonalityFeedback).values({
            question: question.question,
            answer: answers[index],
            userEmail: user ? user.emailAddresses?.[0]?.emailAddress : null,
            createdAt: new Date().toISOString(),
            index: index + 1
          })
        )
      );

      router.push('/results');
    } catch (error) {
      console.error('Error saving responses:', error);
    }
  };

  return (
    <div className="p-10">
      <h2 className="font-bold text-2xl mb-4 p-2 border rounded-lg bg-[#3783a1] text-[#fff7db] text-center">Personality Quiz</h2>
      <form>
        {questions.map((question, questionIndex) => (
          <div key={questionIndex} className="my-4 text-lg">
            <h3>{`${questionIndex + 1}. ${question.question}`}</h3>
            <div className="flex flex-wrap">
              {question.answers.map((answer, index) => (
                <label key={index} className="m-2">
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    value={answer}
                    checked={answers[questionIndex] === answer}
                    onChange={() => handleAnswerChange(answer, questionIndex)}
                  />
                  {answer}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button 
          type="button"
          onClick={handleSubmit}
          className="mt-4 bg-[#e0cb7c] text-white p-2 rounded text-lg"
        >
          Submit
        </button>
      </form>
    </div>
  );
}

// This is the main component that will be server-side rendered
export default function PersonalityQuiz() {
  // Use state to track client-side rendering
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return (
      <div className="p-10 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="font-bold text-2xl mb-4">Loading Personality Quiz...</h2>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }
  
  return <PersonalityQuizContent />;
}