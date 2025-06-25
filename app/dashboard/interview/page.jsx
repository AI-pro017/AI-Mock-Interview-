'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { PRECONFIGURED_ROLES, DIFFICULTIES, INTERVIEW_FOCUS_OPTIONS, INTERVIEW_STYLES, INTERVIEW_MODES, INDUSTRIES } from '../_components/questions.js';

function NewInterviewPage() {
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobExperience, setJobExperience] = useState(5);
  const [industry, setIndustry] = useState('');
  const [skills, setSkills] = useState('');
  
  const [difficulty, setDifficulty] = useState('Medium');
  const [focus, setFocus] = useState('Balanced');
  const [duration, setDuration] = useState([30]);
  const [style, setStyle] = useState('Conversational');
  const [mode, setMode] = useState('Practice');
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isCustomRole = selectedRole === 'Custom';

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const interviewData = {
      jobRole: isCustomRole ? customRole : selectedRole,
      jobDescription,
      jobExperience: jobExperience.toString(),
      industry,
      skills,
      difficulty,
      focus,
      duration: duration[0],
      interviewStyle: style,
      interviewMode: mode,
    };

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interviewData),
      });

      if (!response.ok) {
        throw new Error('Failed to create interview session.');
      }
      
      const data = await response.json();
      toast.success('New interview session created!');
      router.push(`/dashboard/interview/${data.interviewId}/start`);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Let's Get Started</h1>
      <p className="text-gray-500 mb-8">Configure your mock interview session down to the last detail.</p>
      
      <form onSubmit={onSubmit} className="space-y-8">
        {/* Role Selection & Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>1. Role Selection & Configuration</CardTitle>
            <CardDescription>Choose a role, define the experience level, and specify key skills for a tailored experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Select a Role</Label>
                <Select onValueChange={(value) => setSelectedRole(value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRECONFIGURED_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                    <SelectItem value="Custom">Create a Custom Role...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input placeholder="e.g., 5" type="number" value={jobExperience} onChange={(e) => setJobExperience(parseInt(e.target.value))} required />
              </div>
            </div>
            
            <div className="space-y-2">
                <Label>Key Skills to Focus On</Label>
                <Input placeholder="e.g., TypeScript, AWS, System Design, Agile" value={skills} onChange={(e) => setSkills(e.target.value)} />
            </div>

            {isCustomRole && (
              <div className="p-4 border bg-gray-50 rounded-lg space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Custom Job Role / Position</Label>
                        <Input placeholder="e.g., Lead DevOps Engineer" value={customRole} onChange={(e) => setCustomRole(e.target.value)} required={isCustomRole} />
                    </div>
                    <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select onValueChange={setIndustry}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select industry..." />
                            </SelectTrigger>
                            <SelectContent>
                                {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                  <Label>Job Description / Responsibilities</Label>
                  <Textarea placeholder="Paste the full job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} required={isCustomRole} rows={6}/>
                </div>
              </div>
            )}
             {!isCustomRole && selectedRole && (
                <div className="space-y-2">
                  <Label>Job Description (auto-generated for pre-configured roles)</Label>
                  <Textarea placeholder={`The AI will generate questions suitable for a ${selectedRole} with ${jobExperience} years of experience, focusing on the key skills you provided.`} readOnly rows={4}/>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Interview Setup & Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>2. Interview Setup & Configuration</CardTitle>
            <CardDescription>Fine-tune the style, focus, and length of your interview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
                <Label>Interview Duration: {duration[0]} minutes</Label>
                <Slider defaultValue={[30]} min={15} max={60} step={15} onValueChange={setDuration}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                    <Label>Interview Difficulty</Label>
                    <RadioGroup defaultValue="Medium" onValueChange={setDifficulty} className="flex gap-4">
                        {DIFFICULTIES.map(d => <div key={d} className="flex items-center space-x-2"><RadioGroupItem value={d} id={d}/><Label htmlFor={d}>{d}</Label></div>)}
                    </RadioGroup>
                </div>
                <div className="space-y-3">
                    <Label>Interview Focus</Label>
                     <RadioGroup defaultValue="Balanced" onValueChange={setFocus} className="flex gap-4">
                        {INTERVIEW_FOCUS_OPTIONS.map(f => <div key={f} className="flex items-center space-x-2"><RadioGroupItem value={f} id={f}/><Label htmlFor={f}>{f}</Label></div>)}
                    </RadioGroup>
                </div>
                <div className="space-y-3">
                    <Label>Interview Style & Mode</Label>
                    <div className="flex gap-4">
                        <Select onValueChange={setStyle} defaultValue="Conversational">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {INTERVIEW_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select onValueChange={setMode} defaultValue="Practice">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {INTERVIEW_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Interview...</> : 'Start Interview'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default NewInterviewPage; 