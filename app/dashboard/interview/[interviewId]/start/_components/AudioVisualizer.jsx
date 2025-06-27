"use client";

import React, { useEffect, useRef } from 'react';

export default function AudioVisualizer({ audioStream }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!audioStream || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.fillStyle = '#F3F4F6'; // bg-gray-100
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for(let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        
        canvasCtx.fillStyle = `rgb(59, 130, 246, ${barHeight / 100})`; // A blue color
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioStream]);

  return <canvas ref={canvasRef} width="100%" height="100%" />;
} 