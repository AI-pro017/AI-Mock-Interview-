'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import timezones from "@/lib/timezones"; // We will create this file next

export default function ProfileForm({ user }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    experienceLevel: user.experienceLevel || '',
    targetRoles: user.targetRoles || '',
    timezone: user.timezone || '',
    resume: user.resume || null,
  });
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [parsingResume, setParsingResume] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();

  const experienceLevels = [
    'Entry-level / New Grad',
    'Junior (1-2 years)',
    'Mid-level (3-5 years)',
    'Senior (5-10 years)',
    'Staff / Principal (10+ years)',
    'Manager',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'application/pdf' || 
          file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setResumeFile(file);
      } else {
        toast.error("Please upload a PDF or Word document");
        fileInputRef.current.value = "";
      }
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      toast.error("Please select a file first");
      return;
    }

    setParsingResume(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('resume', resumeFile);
      
      const response = await fetch('/api/profile/update/resume', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload resume');
      }
      
      // Update form with parsed resume data
      setFormData(prev => ({
        ...prev,
        ...data.parsedData,
        resume: data.resumeUrl
      }));
      
      toast.success("Resume uploaded and parsed successfully!");
      
    } catch (error) {
      toast.error(error.message || "Error uploading resume");
    } finally {
      setParsingResume(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // For the form submission, we need to create FormData if there's a resume file
      let submitData;
      let options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      };
      
      const response = await fetch('/api/profile/update', options);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }
      
      toast.success("Profile updated successfully!");
      router.refresh(); // Refresh the page to show updated data

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Personal & Professional Details</CardTitle>
          <CardDescription>Update your information to get tailored interview questions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Experience Level</Label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select your experience</option>
                {experienceLevels.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select your timezone</option>
                {timezones.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetRoles">Target Roles</Label>
            <Textarea
              id="targetRoles"
              name="targetRoles"
              value={formData.targetRoles}
              onChange={handleChange}
              placeholder="e.g., Frontend Developer, Product Manager, Data Scientist"
            />
             <p className="text-xs text-muted-foreground">Enter roles separated by commas.</p>
          </div>

          {/* Resume Upload Section */}
          <div className="space-y-2 border rounded-md p-4 bg-gray-50">
            <Label htmlFor="resume">Resume Upload</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input 
                  id="resume" 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="max-w-md"
                />
                <Button 
                  type="button" 
                  onClick={handleResumeUpload}
                  disabled={!resumeFile || parsingResume}
                  variant="secondary"
                >
                  {parsingResume ? 'Parsing...' : 'Upload & Parse'}
                </Button>
              </div>
              {formData.resume && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Resume uploaded successfully
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload your resume to automatically fill your profile details. Supported formats: PDF, DOC, DOCX.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 