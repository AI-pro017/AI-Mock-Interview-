"use client";

import { useEffect, useRef } from 'react';

export default function ConversationDisplay({ conversation, isAISpeaking, isUserSpeaking, currentUserResponse }) {
  const scrollRef = useRef(null);

  // Auto-scroll to the bottom of the conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, isAISpeaking, isUserSpeaking, currentUserResponse]);
  
  return (
    <div ref={scrollRef} className="h-96 overflow-y-auto border rounded-md p-4 mb-4 bg-gray-50">
      {conversation.length === 0 && !isAISpeaking && !isUserSpeaking ? (
        <div className="text-center text-gray-500 h-full flex items-center justify-center">
          <p>The interview transcript will appear here. Click "Start Interview" to begin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversation.map((item, index) => (
            <div key={index} className={`p-3 rounded-lg max-w-[90%] ${item.role === 'ai' ? 'bg-blue-100 self-start' : 'bg-green-100 self-end'}`}>
              <div className="font-bold">
                {item.role === 'ai' ? 'Interviewer' : 'You'}
              </div>
              <div>{item.text}</div>
            </div>
          ))}
          
          {isAISpeaking && (
            <div className="p-3 rounded-lg bg-blue-100 animate-pulse self-start max-w-[90%]">
              <div className="font-bold">Interviewer</div>
              <div>Speaking...</div>
            </div>
          )}
          
          {isUserSpeaking && (
            <div className="p-3 rounded-lg bg-green-100 self-end max-w-[90%]">
              <div className="font-bold">You</div>
              <div>{currentUserResponse || "Listening..."}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 