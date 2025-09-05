"use client";

import { useState, useCallback, useRef } from 'react';

export const useAI = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [stage2Suggestions, setStage2Suggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isStage2Loading, setIsStage2Loading] = useState(false);
    const [showStage2, setShowStage2] = useState(false);
    
    // Context retention
    const sessionContextRef = useRef([]);
    const processedQuestionsRef = useRef(new Set());
    
    // Request management
    const lastRequestRef = useRef(null);
    const abortControllerRef = useRef(null);
    const stage2AbortControllerRef = useRef(null);
    const lastSuccessfulRequestRef = useRef(null);
    const stage2TimeoutRef = useRef(null);

    // Two-stage suggestion generation
    const generateSuggestions = useCallback(async (question, history) => {
        // Clear existing timeout for stage 2
        if (stage2TimeoutRef.current) {
            clearTimeout(stage2TimeoutRef.current);
        }

        // Abort any existing requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (stage2AbortControllerRef.current) {
            stage2AbortControllerRef.current.abort();
        }

        // Create new abort controllers
        abortControllerRef.current = new AbortController();
        stage2AbortControllerRef.current = new AbortController();

        // Check for duplicate requests
        const requestKey = `${question}-${JSON.stringify(history)}`;
        if (lastSuccessfulRequestRef.current === requestKey) {
            return;
        }
        
        lastRequestRef.current = requestKey;

        // Update session context
        sessionContextRef.current.push({
            question,
            timestamp: Date.now(),
            history: [...history]
        });

        // Keep only last 10 questions for context
        if (sessionContextRef.current.length > 10) {
            sessionContextRef.current = sessionContextRef.current.slice(-10);
        }

        // Check if this is a follow-up question
        const isFollowUp = checkIfFollowUp(question, sessionContextRef.current);

        setIsLoading(true);
        setError(null);

        try {
            // STAGE 1: Generate quick response immediately
            const stage1Response = await fetch('/api/copilot-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question, 
                    history, 
                    sessionContext: sessionContextRef.current,
                    stage: 1,
                    isFollowUp
                }),
                signal: abortControllerRef.current.signal,
            });

            const contentType = stage1Response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned invalid response format');
            }

            const stage1Data = await stage1Response.json();

            if (!stage1Response.ok) {
                throw new Error(stage1Data.error || 'Failed to get AI suggestions');
            }

            // Display Stage 1 results immediately and reset stage 2
            setSuggestions(stage1Data.suggestions || []);
            setStage2Suggestions([]);
            setShowStage2(false);
            setIsLoading(false);
            
            // Mark this question as processed
            processedQuestionsRef.current.add(question.toLowerCase().trim());

            // Calculate delay based on Stage 1 response length
            const aiSuggestion = stage1Data.suggestions?.find(s => s.type === '💡 AI Suggestion');
            const responseLength = aiSuggestion?.content?.length || 100;
            
            // Estimate reading time: ~200 characters per minute reading speed
            // Minimum 3 seconds, maximum 8 seconds
            const readingTimeMs = Math.max(3000, Math.min(8000, (responseLength / 200) * 60 * 1000));

            // STAGE 2: Start generating detailed response immediately, display after reading time
            setIsStage2Loading(true);
            
            // Start Stage 2 generation immediately (no delay)
            const stage2Promise = fetch('/api/copilot-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question, 
                    history, 
                    sessionContext: sessionContextRef.current,
                    stage: 2,
                    isFollowUp
                }),
                signal: stage2AbortControllerRef.current.signal,
            });

            // Wait for both: Stage 2 generation + reading time
            stage2TimeoutRef.current = setTimeout(async () => {
                try {
                    const stage2Response = await stage2Promise;
                    
                    const contentType = stage2Response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        throw new Error('Server returned invalid response format');
                    }

                    const stage2Data = await stage2Response.json();

                    if (!stage2Response.ok) {
                        throw new Error(stage2Data.error || 'Failed to get detailed AI suggestions');
                    }

                    // Store Stage 2 suggestions separately (don't replace Stage 1)
                    setStage2Suggestions(stage2Data.suggestions || []);
                    
                    // Update successful request tracker
                    lastSuccessfulRequestRef.current = requestKey;
                    
                } catch (err) {
                    if (err.name === 'AbortError') {
                        return;
                    }
                    
                    console.error("Error generating stage 2 suggestions:", err);
                    // Keep Stage 1 suggestions on Stage 2 error
                } finally {
                    setIsStage2Loading(false);
                }
            }, readingTimeMs);
                
        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }
            
            console.error("Error generating stage 1 suggestions:", err);
            setError(err.message || "Could not load AI suggestions at this time.");
            setSuggestions([]);
            setIsLoading(false);
            setIsStage2Loading(false);
        }

    }, []);

    // Helper function to check if current question is a follow-up
    const checkIfFollowUp = (currentQuestion, sessionContext) => {
        if (sessionContext.length === 0) return false;
        
        const recentQuestions = sessionContext.slice(-3);
        const followUpIndicators = [
            'example', 'elaborate', 'more', 'detail', 'explain', 'expand', 
            'how', 'what about', 'can you', 'tell me more', 'specifically'
        ];
        
        const currentLower = currentQuestion.toLowerCase();
        return followUpIndicators.some(indicator => currentLower.includes(indicator));
    };

    const clearSuggestions = useCallback(() => {
        // Clear stage 2 timeout
        if (stage2TimeoutRef.current) {
            clearTimeout(stage2TimeoutRef.current);
        }
        
        // Abort any ongoing requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (stage2AbortControllerRef.current) {
            stage2AbortControllerRef.current.abort();
        }
        
        setSuggestions([]);
        setStage2Suggestions([]);
        setShowStage2(false);
        setError(null);
        setIsLoading(false);
        setIsStage2Loading(false);
        lastRequestRef.current = null;
        lastSuccessfulRequestRef.current = null;
    }, []);

    const clearSessionContext = useCallback(() => {
        sessionContextRef.current = [];
        processedQuestionsRef.current.clear();
    }, []);

    // Function to toggle between stage 1 and stage 2
    const toggleStage2 = useCallback(() => {
        setShowStage2(prev => !prev);
    }, []);

    return { 
        suggestions, 
        stage2Suggestions,
        showStage2,
        isLoading, 
        isStage2Loading,
        error, 
        generateSuggestions, 
        clearSuggestions,
        clearSessionContext,
        toggleStage2,
        sessionContext: sessionContextRef.current
    };
}; 