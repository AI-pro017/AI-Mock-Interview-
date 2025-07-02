"use client";

import React, { useEffect, useRef } from 'react';

export default function AudioVisualizer({ audioStream, isActive = true, className = "" }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!audioStream || !canvasRef.current || !isActive) {
      // If not active or no stream, clear the canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        canvasCtx.fillStyle = '#F3F4F6'; // bg-gray-100
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    
    // Check if the stream has audio tracks
    const audioTracks = audioStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn("AudioVisualizer: No audio tracks in stream");
      return;
    }
    
    console.log("AudioVisualizer: Setting up with audio tracks:", audioTracks.length);
    
    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = canvasRef.current;
    // Set explicit dimensions for the canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const canvasCtx = canvas.getContext('2d');
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.fillStyle = '#F3F4F6'; // bg-gray-100
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate bar width based on canvas size and buffer length
      const barWidth = Math.max(1, (canvas.width / bufferLength) * 2.5);
      let x = 0;
      
      for(let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        canvasCtx.fillStyle = `rgb(59, 130, 246, ${Math.min(1, barHeight / (canvas.height/2))})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (audioContext.state !== 'closed') {
        try {
          audioContext.close();
        } catch (e) {
          console.error("Error closing audio context:", e);
        }
      }
    };
  }, [audioStream, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
} 