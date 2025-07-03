"use client";

import { Lightbulb, Volume2 } from 'lucide-react';
import React from 'react';

export default function QuestionsSection({ mockInterviewQuestions, activeQuestionIndex }) {

  const textToSpeech = (text) => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speech);
    } else {
      alert('Sorry, your browser does not support text-to-speech.');
    }
  }

  return mockInterviewQuestions && (
    <div className='p-5 border border-gray-700 rounded-lg my-10 bg-gray-800 text-white'>
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'>
        {mockInterviewQuestions.map((question, index) => (
          <h2 
            key={index}
            className={`p-2 border border-gray-600 rounded-full text-xs md:text-sm text-center cursor-pointer ${activeQuestionIndex === index ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          >
            Question #{index + 1}
          </h2>
        ))}
      </div>
      <p className='my-5 text-md md:text-lg'>{mockInterviewQuestions[activeQuestionIndex]?.question}</p>
      <Volume2 
        className='cursor-pointer text-blue-400 hover:text-blue-300' 
        onClick={() => textToSpeech(mockInterviewQuestions[activeQuestionIndex]?.question)} 
      />

      <div className='border border-blue-800 rounded-lg p-5 bg-blue-900 bg-opacity-20 mt-10'>
        <h2 className='flex gap-2 items-center text-blue-300'>
          <Lightbulb />
          <strong>Note:</strong>
        </h2>
        <p className='text-sm text-blue-200 my-2'>{process.env.NEXT_PUBLIC_QUESTION_NOTE}</p>
      </div>
    </div>
  );
}
