"use client";

import { useState, useCallback, useRef } from 'react';

export const useTranscriptManager = () => {
    const [transcripts, setTranscripts] = useState([]);
    const transcriptsRef = useRef([]);
    const speakerUtteranceRef = useRef({});
    const speakerLabelMap = useRef({});
    const nextClientNumber = useRef(1);
    const timeoutRef = useRef({});
    const segmentDataRef = useRef({});

    const getSpeakerLabel = useCallback((speakerId) => {
        if (speakerId === 'user') return 'You';
        if (!speakerLabelMap.current[speakerId]) {
            speakerLabelMap.current[speakerId] = `Client ${nextClientNumber.current++}`;
        }
        return speakerLabelMap.current[speakerId];
    }, []);

    const updateTranscripts = useCallback((newTranscripts) => {
        transcriptsRef.current = newTranscripts;
        setTranscripts(newTranscripts);
    }, []);

    const processTranscript = useCallback((transcriptData) => {
        if (!transcriptData || !transcriptData.channel || !transcriptData.channel.alternatives[0].transcript) {
            return;
        }

        const { 
            is_final, 
            speech_final, 
            channel, 
            speaker, 
            speakerIdentifier, 
            start, 
            duration
        } = transcriptData;
        const text = channel.alternatives[0].transcript;
        
        if (!text.trim()) return;

        const uniqueSpeakerId = speakerIdentifier === 'user' ? 'user' : `client_${speaker || 0}`;
        const speakerLabel = getSpeakerLabel(uniqueSpeakerId);
        
        // Clear any existing timeout for this speaker
        if (timeoutRef.current[uniqueSpeakerId]) {
            clearTimeout(timeoutRef.current[uniqueSpeakerId]);
            timeoutRef.current[uniqueSpeakerId] = null;
        }
        
        // Use current ref state instead of stale state
        const currentTranscripts = transcriptsRef.current;
        const activeBlockId = speakerUtteranceRef.current[uniqueSpeakerId];

        let newTranscripts;

        if (activeBlockId) {
            // Get the current segment data for this speaker
            const currentSegmentData = segmentDataRef.current[uniqueSpeakerId] || { segments: [] };
            
            // Find if this segment already exists (by start time)
            const existingSegmentIndex = currentSegmentData.segments.findIndex(
                seg => Math.abs(seg.start - start) < 0.5 // Within 0.5 seconds
            );
            
            if (existingSegmentIndex >= 0) {
                // Update existing segment only if text is longer or final
                const existingSegment = currentSegmentData.segments[existingSegmentIndex];
                if (is_final || text.length >= existingSegment.text.length) {
                    currentSegmentData.segments[existingSegmentIndex] = {
                        start,
                        duration,
                        text,
                        is_final
                    };
                }
            } else {
                // Add new segment
                currentSegmentData.segments.push({
                    start,
                    duration,
                    text,
                    is_final
                });
            }
            
            // Sort segments by start time and combine them
            currentSegmentData.segments.sort((a, b) => a.start - b.start);
            const combinedText = currentSegmentData.segments.map(seg => seg.text).join(' ');
            
            // Update the ref
            segmentDataRef.current[uniqueSpeakerId] = currentSegmentData;
            
            // Update the transcript block
            newTranscripts = currentTranscripts.map(b =>
                b.id === activeBlockId ? { ...b, text: combinedText } : b
            );
        } 
        else {
            // Create new block
            const newBlock = { 
                id: Date.now() + Math.random(), 
                speaker: speakerLabel, 
                text
            };
            
            // Set this as the active block
            speakerUtteranceRef.current[uniqueSpeakerId] = newBlock.id;
            
            // Initialize segment data for this speaker
            segmentDataRef.current[uniqueSpeakerId] = {
                segments: [{
                    start: start || 0,
                    duration: duration || 0,
                    text,
                    is_final: is_final || false
                }]
            };
            
            newTranscripts = [...currentTranscripts, newBlock];
        }
        
        // Update the state
        updateTranscripts(newTranscripts);
        
        // Set a timeout to close this block after 4 seconds of no new transcripts
        timeoutRef.current[uniqueSpeakerId] = setTimeout(() => {
            speakerUtteranceRef.current[uniqueSpeakerId] = null;
            segmentDataRef.current[uniqueSpeakerId] = null;
            timeoutRef.current[uniqueSpeakerId] = null;
        }, 4000);
        
    }, [getSpeakerLabel, updateTranscripts]);
    
    const clearTranscripts = useCallback(() => {
        transcriptsRef.current = [];
        setTranscripts([]);
        speakerUtteranceRef.current = {};
        speakerLabelMap.current = {};
        nextClientNumber.current = 1;
        segmentDataRef.current = {};
        
        // Clear all timeouts
        Object.values(timeoutRef.current).forEach(timeout => {
            if (timeout) clearTimeout(timeout);
        });
        timeoutRef.current = {};
    }, []);

    return { transcripts, processTranscript, clearTranscripts, getSpeakerLabel };
};
