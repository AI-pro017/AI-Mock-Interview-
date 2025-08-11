"use client";

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeHighlighter = ({ content }) => {
    // Function to parse content and identify code blocks
    const parseContent = (text) => {
        // Split by code blocks (```language...``` or ```...```)
        const parts = text.split(/(```[\s\S]*?```)/);
        
        return parts.map((part, index) => {
            // Check if this part is a code block
            const codeMatch = part.match(/^```(\w+)?\n?([\s\S]*?)```$/);
            
            if (codeMatch) {
                const language = codeMatch[1] || 'text';
                const code = codeMatch[2].trim();
                
                return (
                    <div key={index} className="my-4">
                        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                    {language}
                                </span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(code)}
                                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                                >
                                    Copy
                                </button>
                            </div>
                            <SyntaxHighlighter
                                language={language}
                                style={vscDarkPlus}
                                customStyle={{
                                    margin: 0,
                                    padding: '16px',
                                    background: 'transparent',
                                    fontSize: '16px',
                                    lineHeight: '1.5'
                                }}
                                showLineNumbers={false}
                                wrapLines={true}
                                wrapLongLines={true}
                            >
                                {code}
                            </SyntaxHighlighter>
                        </div>
                    </div>
                );
            } else {
                // Regular text - preserve line breaks and format
                return (
                    <span key={index} className="whitespace-pre-wrap">
                        {part}
                    </span>
                );
            }
        });
    };

    return (
        <div className="text-gray-300 leading-relaxed text-base md:text-lg">
            {parseContent(content)}
        </div>
    );
};

export default CodeHighlighter; 