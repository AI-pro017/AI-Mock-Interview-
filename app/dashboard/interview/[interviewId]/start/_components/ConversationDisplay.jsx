"use client";

import { useEffect, useRef } from 'react';

export default function ConversationDisplay({ 
  conversation, 
  currentUserResponse, 
  interimTranscript, 
  isUserSpeaking, 
  isListening,
  error
}) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [conversation, currentUserResponse, interimTranscript]);

  // Filter out no-speech errors from display
  const displayError = error && !error.message?.includes('no-speech') ? error : null;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-900 text-white">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-4 mb-2"
      >
        {conversation.map((message, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg max-w-[90%] ${
              message.role === 'ai' 
                ? 'bg-gray-800 text-white self-start' 
                : 'bg-blue-900 text-white self-end'
            }`}
          >
            <div className="font-medium mb-1">
              {message.role === 'ai' ? 'Interviewer' : 'You'}
            </div>
            <div>{message.text}</div>
          </div>
        ))}
        
        {/* User's current response */}
        {(currentUserResponse || interimTranscript) && (
          <div className="p-3 bg-blue-900 text-white rounded-lg max-w-[90%] self-end">
            <div className="font-medium mb-1">You</div>
            <div>
              {currentUserResponse}
              {interimTranscript && (
                <span className="text-gray-300">{interimTranscript}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="text-center p-2 text-sm text-gray-300">
        {isListening && (
          <div className="flex items-center justify-center">
            <span className="mr-2">
              {isUserSpeaking ? "Listening..." : "Waiting for you to speak..."}
            </span>
            <span className="flex gap-1">
              <span className={`h-2 w-2 rounded-full ${isUserSpeaking ? 'bg-blue-500' : 'bg-gray-600'}`}></span>
              <span className={`h-2 w-2 rounded-full ${isUserSpeaking ? 'bg-blue-500' : 'bg-gray-600'} animate-pulse`}></span>
              <span className={`h-2 w-2 rounded-full ${isUserSpeaking ? 'bg-blue-500' : 'bg-gray-600'}`}></span>
            </span>
          </div>
        )}
        
        {/* Only show important errors, not no-speech */}
        {displayError && (
          <div className="text-red-400 mt-2">
            <p>An error occurred:</p>
            <p>{displayError.message}</p>
          </div>
        )}
      </div>
    </div>
  );
} 