"use client";

import { useState, useRef } from 'react';

export default function TTSTestPage() {
  const [text, setText] = useState("Hello, this is a test of the text to speech system.");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);
  
  const testApiConnection = async () => {
    setStatus("Testing API connection...");
    setLoading(true);
    
    try {
      const response = await fetch('/api/tts-test');
      const data = await response.json();
      
      if (response.ok) {
        setStatus(`API connection successful: ${data.message}. Found ${data.voiceCount} voices.`);
      } else {
        setStatus(`API connection failed: ${data.error}`);
        console.error("API test error details:", data);
      }
    } catch (error) {
      setStatus(`Error testing API: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const testTextToSpeech = async () => {
    setStatus("Converting text to speech...");
    setLoading(true);
    
    try {
      // Stop any previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed with status ${response.status}: ${errorData.error || 'Unknown error'}`);
      }
      
      // Get the audio blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create and play audio
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setStatus("Audio played successfully");
      };
      
      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        setStatus(`Audio playback error: ${e.currentTarget.error?.message || 'Unknown error'}`);
      };
      
      audioRef.current = audio;
      await audio.play();
      setStatus("Playing audio...");
      
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Text-to-Speech Test Page</h1>
      
      <div className="mb-6">
        <button 
          onClick={testApiConnection} 
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded mr-3 hover:bg-blue-600 disabled:opacity-50"
        >
          Test API Connection
        </button>
        
        <button 
          onClick={testTextToSpeech} 
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Text-to-Speech
        </button>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">Text to convert:</label>
        <textarea 
          value={text} 
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 border rounded"
          rows={4}
        />
      </div>
      
      {status && (
        <div className={`p-4 rounded ${status.includes('Error') ? 'bg-red-100' : 'bg-green-100'}`}>
          {status}
        </div>
      )}
    </div>
  );
} 