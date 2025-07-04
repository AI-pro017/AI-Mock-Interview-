"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';

export default function ResumeUploader({ onDataExtracted, onCompletionChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // Dynamically import the parser only when needed
      const { extractTextFromFile } = await import('@/utils/resumeParser');
      
      // Step 1: Extract text from file
      const text = await extractTextFromFile(file);
      
      // Step 2: Call API to parse with AI
      const response = await fetch('/api/parse-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse resume.');
      }
      
      const extractedData = await response.json();
      
      // Step 3: Pass data to parent component
      onDataExtracted(extractedData);

      // Step 4: Calculate and pass completion percentage
      const completion = calculateCompletion(extractedData);
      if (onCompletionChange) {
        onCompletionChange(completion);
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Resume parsing failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCompletion = (data) => {
    const weights = {
        phoneNumber: 5,
        location: 5,
        professionalTitle: 10,
        yearsOfExperience: 5,
        professionalSummary: 10,
        workHistory: 20,
        skills: 15,
        education: 10,
        certifications: 5,
        hobbiesInterests: 5
    };
    
    let total = 10;
    
    // Assuming name and email are pre-filled or parsed
    if (data.phoneNumber) total += weights.phoneNumber;
    if (data.location?.city || data.location?.country) total += weights.location;
    if (data.professionalTitle) total += weights.professionalTitle;
    if (data.yearsOfExperience) total += weights.yearsOfExperience;
    if (data.professionalSummary) total += weights.professionalSummary;
    if (data.workHistory?.length > 0) total += weights.workHistory;
    if (data.skills?.length > 0) total += weights.skills;
    if (data.education?.length > 0) total += weights.education;
    if (data.certifications?.length > 0) total += weights.certifications;
    if (data.hobbiesInterests?.length > 0) total += weights.hobbiesInterests;
    
    return total;
  };

  return (
    <div className="my-6">
      <div className="flex items-center justify-center w-full">
        <label htmlFor="resume-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-800">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isLoading ? (
              <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-slate-400" />
            )}
            <p className="mb-2 text-sm text-slate-400 mt-2">
              <span className="font-semibold">Click to upload</span> or drag and drop your resume to auto-fill your profile
            </p>
            <p className="text-xs text-slate-500">PDF or DOCX (MAX. 5MB)</p>
          </div>
          <input
            id="resume-upload"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.rtf"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </label>
      </div> 
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
} 