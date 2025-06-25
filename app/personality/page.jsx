// app/personality/page.jsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import questions from '../dashboard/_components/questions'; // Adjusted import path
import { db } from '@/utils/db';
import { PersonalityFeedback } from '@/utils/schema'; // Import the PersonalityFeedback table schema
import { useUser } from '@clerk/nextjs'; // Assuming you're using Clerk for user management

function PersonalityQuiz() {
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const router = useRouter();
  const { user } = useUser(); // Retrieve user info from Clerk (or modify according to your auth setup)

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
            userEmail: user ? user.email : null, // Add user email if available
            createdAt: new Date().toISOString(),
            index: index + 1 // Store the question index (starting from 1)
          })
        )
      );

      // Redirect to results page after successful submission
      router.push('/results');
    } catch (error) {
      console.error('Error saving responses:', error);
    }
  };

  return (
    <div className="p-10">
      <h2 className="font-bold text-2xl mb-4 p-2 border rounded-lg bg-[#3783a1]  text-[#fff7db] text-center">Personality Quiz</h2>
      <form>
        {questions.map((question, questionIndex) => (
          <div key={questionIndex} className="my-4 text-lg">
            <h3>{`${questionIndex + 1}. ${question.question}`}</h3> {/* Display question index */}
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
          className="mt-4 bg-[#e0cb7c]  text-white p-2 rounded text-lg  "
        >
          Submit
        </button>
      </form>
    </div>
  );
}

export default PersonalityQuiz;
