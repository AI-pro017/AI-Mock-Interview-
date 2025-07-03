'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import timezones from "@/lib/timezones";
import { User } from 'lucide-react';

export default function ProfileForm({ user }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    experienceLevel: user.experienceLevel || '',
    targetRoles: user.targetRoles || '',
    timezone: user.timezone || '',
  });
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

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
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-white/10">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center mb-4">
          <User className="h-5 w-5 text-slate-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">Personal & Professional Details</h2>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Update your information to get tailored interview questions.
        </p>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Full Name</Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                className="bg-slate-900/50 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={formData.email} 
                disabled 
                className="bg-slate-900/50 border-slate-700 text-white opacity-70"
              />
              <p className="text-xs text-slate-500">Email cannot be changed.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experienceLevel" className="text-slate-300">Experience Level</Label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="" disabled>Select your experience</option>
                {experienceLevels.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-slate-300">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="" disabled>Select your timezone</option>
                {timezones.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetRoles" className="text-slate-300">Target Roles</Label>
            <Textarea
              id="targetRoles"
              name="targetRoles"
              value={formData.targetRoles}
              onChange={handleChange}
              placeholder="e.g., Frontend Developer, Product Manager, Data Scientist"
              className="bg-slate-900/50 border-slate-700 text-white min-h-[80px]"
            />
            <p className="text-xs text-slate-500">Enter roles separated by commas.</p>
          </div>
        </div>
        
        <div className="mt-6">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
} 