'use client';

import { useState } from "react";
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