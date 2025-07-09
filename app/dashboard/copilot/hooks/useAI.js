"use client";

import { useState, useCallback, useRef } from 'react';

export const useAI = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Debouncing
    const debounceTimeoutRef = useRef(null);
    const lastRequestRef = useRef(null);
    const abortControllerRef = useRef(null);
    const lastSuccessfulRequestRef = useRef(null);

    const generateSuggestions = useCallback(async (question, history) => {
        // Clear existing debounce timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Abort any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        // Check if this is the same request as the last SUCCESSFUL one
        const requestKey = `${question}-${JSON.stringify(history)}`;
        if (lastSuccessfulRequestRef.current === requestKey) {
            return; // Skip duplicate successful requests
        }
        
        lastRequestRef.current = requestKey;

        // Debounce the request
        debounceTimeoutRef.current = setTimeout(async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const response = await fetch('/api/copilot-suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question, history }),
                    signal: abortControllerRef.current.signal,
                });

                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server returned invalid response format');
                }

                const data = await response.json();

                if (!response.ok) {
                    // Handle different HTTP status codes
                    throw new Error(data.error || 'Failed to get AI suggestions');
                }

                setSuggestions(data.suggestions || []);
                setError(null);
                
                // Update successful request tracker
                lastSuccessfulRequestRef.current = requestKey;
                
            } catch (err) {
                // Don't show error if request was aborted
                if (err.name === 'AbortError') {
                    return;
                }
                
                console.error("Error generating suggestions:", err);
                
                // Don't update successful request tracker on error
                // This allows retry for the same question
                
                // Show the error message from the server or a generic one
                setError(err.message || "Could not load AI suggestions at this time.");
                
                // Clear suggestions on error
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        }, 2000); // 2 second debounce
    }, []);

    const clearSuggestions = useCallback(() => {
        // Clear debounce timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        
        // Abort any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        setSuggestions([]);
        setError(null);
        setIsLoading(false);
        lastRequestRef.current = null;
        lastSuccessfulRequestRef.current = null;
    }, []);

    return { 
        suggestions, 
        isLoading, 
        error, 
        generateSuggestions, 
        clearSuggestions 
    };
}; 