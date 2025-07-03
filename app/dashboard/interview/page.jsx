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
        <div className="p-10 bg-[#0d1117] min-h-screen text-white">
            <h2 className="font-bold text-3xl text-white">Let's Get Started</h2>
            <h3 className="text-gray-400 mt-2">Create a new mock interview session with your custom settings.</h3>

            <form onSubmit={onSubmit}>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-10 mt-8'>
                    {/* Role Selection & Configuration */}
                    <Card className="bg-[#161b22] border-gray-700 text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl font-semibold text-white">1. Role Selection & Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label htmlFor="role" className="text-gray-300">Select a Role</Label>
                                <Select onValueChange={setSelectedRole} required>
                                    <SelectTrigger className="bg-[#0d1117] border-gray-600 text-white">
                                        <SelectValue placeholder="E.g., Software Engineer" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#161b22] border-gray-600 text-white">
                                        {PRE_CONFIGURED_ROLES.map((role) => (
                                            <SelectItem key={role.value} value={role.value} className="hover:bg-gray-700">{role.label}</SelectItem>
                                        ))}
                                        <SelectItem value="custom" className="hover:bg-gray-700">Create a Custom Role...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="jobDescription" className="text-gray-300">Job Description</Label>
                                <Textarea
                                    id="jobDescription"
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the job description or focus area here (optional)..."
                                    className="bg-[#0d1117] border-gray-600 text-white placeholder-gray-500 min-h-[100px]"
                                />
                                <p className="text-xs text-gray-500">Adding a job description helps tailor questions more accurately to your goals.</p>
                            </div>

                            {showCustomRoleFields && (
                                <div className="space-y-6 p-4 border border-gray-700 rounded-lg bg-[#0d1117]">
                                    <div className="space-y-3">
                                        <Label htmlFor="customJobRole" className="text-gray-300">Custom Job Role</Label>
                                        <Input id="customJobRole" value={customJobRole} onChange={(e) => setCustomJobRole(e.target.value)} placeholder="E.g., Senior Python Developer" required={showCustomRoleFields} className="bg-[#0d1117] border-gray-600 text-white placeholder-gray-500" />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="industry" className="text-gray-300">Industry</Label>
                                        <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="E.g., FinTech, Healthcare" className="bg-[#0d1117] border-gray-600 text-white placeholder-gray-500" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label htmlFor="keySkills" className="text-gray-300">Key Skills</Label>
                                <Input id="keySkills" value={keySkills} onChange={(e) => setKeySkills(e.target.value)} placeholder="E.g., React, Node.js, SQL" className="bg-[#0d1117] border-gray-600 text-white placeholder-gray-500" />
                            </div>

                            <div className="space-y-4">
                                <Label className="text-gray-300">Years of Experience: <span className="font-bold text-white">{jobExperience}</span></Label>
                                <Slider
                                    defaultValue={[5]}
                                    max={30}
                                    step={1}
                                    onValueChange={(value) => setJobExperience(value[0])}
                                    className="data-[state=active]:bg-blue-600"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Interview Setup & Configuration */}
                    <Card className="bg-[#161b22] border-gray-700 text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl font-semibold text-white">2. Interview Setup & Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className='grid grid-cols-2 gap-8'>
                                <div className="space-y-3">
                                    <Label className="text-gray-300">Difficulty</Label>
                                    <RadioGroup defaultValue="Medium" onValueChange={setDifficulty} className="space-y-2">
                                        {DIFFICULTY_LEVELS.map(level => (
                                            <div key={level.value} className="flex items-center space-x-2">
                                                <RadioGroupItem value={level.value} id={`diff-${level.value}`} className="border-gray-600 text-blue-500" />
                                                <Label htmlFor={`diff-${level.value}`} className="text-gray-300">{level.label}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-gray-300">Focus</Label>
                                    <RadioGroup defaultValue="Behavioral" onValueChange={setFocus} className="space-y-2">
                                        {FOCUS_AREAS.map(area => (
                                            <div key={area.value} className="flex items-center space-x-2">
                                                <RadioGroupItem value={area.value} id={`focus-${area.value}`} className="border-gray-600 text-blue-500" />
                                                <Label htmlFor={`focus-${area.value}`} className="text-gray-300">{area.label}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <Label className="text-gray-300">Interview Style</Label>
                                <Select defaultValue="Conversational" onValueChange={setInterviewStyle}>
                                    <SelectTrigger className="bg-[#0d1117] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[#161b22] border-gray-600 text-white">
                                        {INTERVIEW_STYLES.map(style => (
                                            <SelectItem key={style.value} value={style.value} className="hover:bg-gray-700">{style.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                             <div className="space-y-3">
                                <Label className="text-gray-300">Interview Mode</Label>
                                <Select defaultValue="Practice" onValueChange={setInterviewMode}>
                                    <SelectTrigger className="bg-[#0d1117] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[#161b22] border-gray-600 text-white">
                                        {INTERVIEW_MODES.map(mode => (
                                            <SelectItem key={mode.value} value={mode.value} className="hover:bg-gray-700">{mode.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-gray-300">Interview Duration (minutes)</Label>
                                <Select defaultValue="15" onValueChange={(val) => setDuration(parseInt(val))}>
                                    <SelectTrigger className="bg-[#0d1117] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[#161b22] border-gray-600 text-white">
                                        {DURATION_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value.toString()} className="hover:bg-gray-700">{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className='flex justify-end mt-10'>
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:bg-gray-500">
                        {loading ? 'Generating Interview...' : 'Start Interview'}
                    </Button>
                </div>
            </form>
        </div>
    );
}