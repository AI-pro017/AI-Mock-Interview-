"use client";

import { useState, useCallback } from 'react';

export const useAI = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateSuggestions = useCallback(async (question, history) => {
        setIsLoading(true);
        setError(null);
        setSuggestions([]); // Clear old suggestions
        try {
            const response = await fetch('/api/copilot-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, history }),
            });

            if (!response.ok) {
                throw new Error("Failed to get AI suggestions.");
            }

            const data = await response.json();
            setSuggestions(data.suggestions || []);
        } catch (err) {
            console.error("Error generating suggestions:", err);
            setError("Could not load suggestions at this time.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
        setError(null);
        setIsLoading(false);
    }, []);

    return { suggestions, isLoading, error, generateSuggestions, clearSuggestions };
}; 