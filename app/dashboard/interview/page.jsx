"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { PRE_CONFIGURED_ROLES, INTERVIEW_STYLES, FOCUS_AREAS, DIFFICULTY_LEVELS, DURATION_OPTIONS, INTERVIEW_MODES } from '../_components/questions';
import { useRouter } from 'next/navigation'; // Import the router

export default function NewInterviewPage() {
    const [selectedRole, setSelectedRole] = useState('');
    const [customJobRole, setCustomJobRole] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [jobExperience, setJobExperience] = useState(5);
    const [industry, setIndustry] = useState('');
    const [keySkills, setKeySkills] = useState('');
    const [difficulty, setDifficulty] = useState('Medium');
    const [focus, setFocus] = useState('Behavioral');
    const [duration, setDuration] = useState(15);
    const [interviewStyle, setInterviewStyle] = useState('Conversational');
    const [interviewMode, setInterviewMode] = useState('Practice');
    const [loading, setLoading] = useState(false);
    const router = useRouter(); // Initialize the router

    const showCustomRoleFields = selectedRole === 'custom';

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobRole: showCustomRoleFields ? customJobRole : selectedRole,
                    jobDescription: jobDescription,
                    jobExperience: jobExperience,
                    industry: industry,
                    skills: keySkills,
                    difficulty: difficulty,
                    focus: focus,
                    duration: duration,
                    interviewStyle: interviewStyle,
                    interviewMode: interviewMode,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Interview created successfully:", result);
                if (result.interviewId) {
                    // This is the crucial part that was missing
                    router.push(`/dashboard/interview/${result.interviewId}/start`);
                } else {
                    alert("Failed to create interview. Please try again.");
                }
            } else {
                alert("An error occurred. Please try again.");
                console.error("Failed to create interview");
            }
        } catch (error) {
            console.error("Error during interview creation:", error);
            alert("An unexpected error occurred. Please check the console.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="p-10">
            <h2 className="font-bold text-2xl">Let's Get Started</h2>
            <h3 className="text-gray-500">Create a new mock interview session with your custom settings.</h3>

            <form onSubmit={onSubmit}>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-10 mt-8'>
                    {/* Role Selection & Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>1. Role Selection & Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="role">Select a Role</Label>
                                <Select onValueChange={setSelectedRole} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="E.g., Software Engineer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRE_CONFIGURED_ROLES.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                        ))}
                                        <SelectItem value="custom">Create a Custom Role...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="jobDescription">Job Description</Label>
                                <Textarea 
                                    id="jobDescription" 
                                    value={jobDescription} 
                                    onChange={(e) => setJobDescription(e.target.value)} 
                                    placeholder="Paste the job description or focus area here (optional)..." 
                                />
                                <p className="text-xs text-gray-500">Adding a job description helps tailor questions more accurately to your goals.</p>
                            </div>

                            {showCustomRoleFields && (
                                <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
                                    <div className="space-y-2">
                                        <Label htmlFor="customJobRole">Custom Job Role</Label>
                                        <Input id="customJobRole" value={customJobRole} onChange={(e) => setCustomJobRole(e.target.value)} placeholder="E.g., Senior Python Developer" required={showCustomRoleFields} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="industry">Industry</Label>
                                        <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="E.g., FinTech, Healthcare" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="keySkills">Key Skills</Label>
                                <Input id="keySkills" value={keySkills} onChange={(e) => setKeySkills(e.target.value)} placeholder="E.g., React, Node.js, SQL" />
                            </div>

                            <div className="space-y-2">
                                <Label>Years of Experience: {jobExperience}</Label>
                                <Slider
                                    defaultValue={[5]}
                                    max={30}
                                    step={1}
                                    onValueChange={(value) => setJobExperience(value[0])}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Interview Setup & Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Interview Setup & Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className='grid grid-cols-2 gap-4'>
                                <div className="space-y-2">
                                    <Label>Difficulty</Label>
                                    <RadioGroup defaultValue="Medium" onValueChange={setDifficulty}>
                                        {DIFFICULTY_LEVELS.map(level => (
                                            <div key={level.value} className="flex items-center space-x-2">
                                                <RadioGroupItem value={level.value} id={`diff-${level.value}`} />
                                                <Label htmlFor={`diff-${level.value}`}>{level.label}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                    <Label>Focus</Label>
                                    <RadioGroup defaultValue="Behavioral" onValueChange={setFocus}>
                                        {FOCUS_AREAS.map(area => (
                                            <div key={area.value} className="flex items-center space-x-2">
                                                <RadioGroupItem value={area.value} id={`focus-${area.value}`} />
                                                <Label htmlFor={`focus-${area.value}`}>{area.label}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Interview Style</Label>
                                <Select defaultValue="Conversational" onValueChange={setInterviewStyle}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {INTERVIEW_STYLES.map(style => (
                                            <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                             <div className="space-y-2">
                                <Label>Interview Mode</Label>
                                <Select defaultValue="Practice" onValueChange={setInterviewMode}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {INTERVIEW_MODES.map(mode => (
                                            <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Interview Duration (minutes)</Label>
                                <Select defaultValue="15" onValueChange={(val) => setDuration(parseInt(val))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {DURATION_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className='flex justify-end mt-6'>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Generating Interview...' : 'Start Interview'}
                    </Button>
                </div>
            </form>
        </div>
    );
}