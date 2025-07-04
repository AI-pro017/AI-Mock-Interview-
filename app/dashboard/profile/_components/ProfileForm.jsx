"use client";

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import timezones from "@/lib/timezones";
import { User, PlusCircle, Trash2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast";

export default function ProfileForm({ initialData, onProfileUpdate }) {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    if (onProfileUpdate) {
      onProfileUpdate(newFormData);
    }
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    const newLocation = { ...formData.location, [name]: value };
    const newFormData = { ...formData, location: newLocation };
    setFormData(newFormData);
    if (onProfileUpdate) {
      onProfileUpdate(newFormData);
    }
  };

  const handleDynamicChange = (section, index, e) => {
    const { name, value } = e.target;
    const updatedSection = [...formData[section]];
    updatedSection[index] = { ...updatedSection[index], [name]: value };
    const newFormData = { ...formData, [section]: updatedSection };
    setFormData(newFormData);
    if (onProfileUpdate) {
      onProfileUpdate(newFormData);
    }
  };

  const addDynamicItem = (section) => {
    let newItem;
    switch(section) {
      case 'workHistory':
        newItem = { companyName: '', jobTitle: '', startDate: '', endDate: '', description: '' };
        break;
      case 'education':
        newItem = { institutionName: '', degreeType: '', fieldOfStudy: '', graduationYear: '', gpa: '' };
        break;
      case 'certifications':
        newItem = { name: '', issuingOrg: '', date: '' };
        break;
      default:
        newItem = {};
    }
    const updatedSection = [...(formData[section] || []), newItem];
    const newFormData = { ...formData, [section]: updatedSection };
    setFormData(newFormData);
    if (onProfileUpdate) {
      onProfileUpdate(newFormData);
    }
  };

  const removeDynamicItem = (section, index) => {
    const updatedSection = formData[section].filter((_, i) => i !== index);
    const newFormData = { ...formData, [section]: updatedSection };
    setFormData(newFormData);
    if (onProfileUpdate) {
      onProfileUpdate(newFormData);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    fetch('/api/profile', {
        method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return response.json();
    })
    .then(data => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    })
    .catch(error => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    })
    .finally(() => {
      setIsSaving(false);
    });
  };

  if (!formData) return <div>Loading form...</div>;

  return (
    <div className="bg-slate-900 rounded-xl p-6 ring-1 ring-white/10">
      <h3 className="text-xl font-semibold mb-6">Your Profile Details</h3>
        <div className="space-y-6">
        {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-300">Full Name</label>
            <Input name="fullName" value={formData.fullName || ''} onChange={handleChange} disabled className="mt-1" />
            </div>
          <div>
            <label className="text-sm font-medium text-slate-300">Email</label>
            <Input name="email" type="email" value={formData.email || ''} onChange={handleChange} disabled className="mt-1" />
            </div>
          <div>
            <label className="text-sm font-medium text-slate-300">Phone Number</label>
            <Input name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleChange} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300">Professional Title</label>
            <Input name="professionalTitle" value={formData.professionalTitle || ''} onChange={handleChange} className="mt-1" />
            </div>
          <div>
            <label className="text-sm font-medium text-slate-300">City</label>
            <Input name="city" value={formData.location?.city || ''} onChange={handleLocationChange} className="mt-1" />
            </div>
          <div>
            <label className="text-sm font-medium text-slate-300">Country</label>
            <Input name="country" value={formData.location?.country || ''} onChange={handleLocationChange} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300">Years of Experience</label>
            <Input name="yearsOfExperience" type="number" value={formData.yearsOfExperience || ''} onChange={handleChange} className="mt-1" />
          </div>
        </div>

        {/* Professional Summary */}
        <div>
          <label className="text-sm font-medium text-slate-300">Professional Summary</label>
          <Textarea name="professionalSummary" value={formData.professionalSummary || ''} onChange={handleChange} className="mt-1" rows={4} />
        </div>
        
        {/* Skills */}
        <div>
          <label className="text-sm font-medium text-slate-300">Skills (comma separated)</label>
          <Input name="skills" value={formData.skills?.join(', ') || ''} onChange={(e) => {
            const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            const newFormData = {...formData, skills};
            setFormData(newFormData);
            if(onProfileUpdate) onProfileUpdate(newFormData)
          }} className="mt-1" />
        </div>
        
        {/* Hobbies & Interests - As a simple text field */}
        <div>
          <label className="text-sm font-medium text-slate-300">Hobbies & Interests</label>
          <Textarea 
            name="hobbiesInterests" 
            value={formData.hobbiesInterests || ''} 
            onChange={(e) => {
              const newFormData = {
                ...formData, 
                hobbiesInterests: e.target.value
              };
              setFormData(newFormData);
              if(onProfileUpdate) onProfileUpdate(newFormData);
            }} 
            placeholder="What do you enjoy doing in your free time?" 
            className="mt-1"
            rows={3}
          />
        </div>
        
        <Accordion type="multiple" defaultValue={['work', 'education']} className="w-full">
          {/* Work History */}
          <AccordionItem value="work">
            <AccordionTrigger className="text-lg font-medium">Work History</AccordionTrigger>
            <AccordionContent>
              {formData.workHistory?.map((item, index) => (
                <div key={index} className="p-4 border border-slate-700 rounded-lg mb-4 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="jobTitle" value={item.jobTitle} onChange={(e) => handleDynamicChange('workHistory', index, e)} placeholder="Job Title" />
                    <Input name="companyName" value={item.companyName} onChange={(e) => handleDynamicChange('workHistory', index, e)} placeholder="Company" />
                    <Input name="startDate" value={item.startDate} onChange={(e) => handleDynamicChange('workHistory', index, e)} placeholder="Start Date" />
                    <Input name="endDate" value={item.endDate} onChange={(e) => handleDynamicChange('workHistory', index, e)} placeholder="End Date" />
                  </div>
                  <Textarea name="description" value={item.description} onChange={(e) => handleDynamicChange('workHistory', index, e)} placeholder="Description" className="mt-4" />
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeDynamicItem('workHistory', index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => addDynamicItem('workHistory')} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Work Experience
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Education */}
          <AccordionItem value="education">
            <AccordionTrigger className="text-lg font-medium">Education</AccordionTrigger>
            <AccordionContent>
              {formData.education?.map((item, index) => (
                <div key={index} className="p-4 border border-slate-700 rounded-lg mb-4 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="institutionName" value={item.institutionName} onChange={(e) => handleDynamicChange('education', index, e)} placeholder="Institution Name" />
                    <Input name="degreeType" value={item.degreeType} onChange={(e) => handleDynamicChange('education', index, e)} placeholder="Degree" />
                    <Input name="fieldOfStudy" value={item.fieldOfStudy} onChange={(e) => handleDynamicChange('education', index, e)} placeholder="Field of Study" />
                    <Input name="graduationYear" value={item.graduationYear} onChange={(e) => handleDynamicChange('education', index, e)} placeholder="Graduation Year" />
                    <Input name="gpa" value={item.gpa} onChange={(e) => handleDynamicChange('education', index, e)} placeholder="GPA (Optional)" />
                  </div>
                   <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeDynamicItem('education', index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => addDynamicItem('education')} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Education
              </Button>
            </AccordionContent>
          </AccordionItem>
          
           {/* Certifications */}
          <AccordionItem value="certifications">
            <AccordionTrigger className="text-lg font-medium">Certifications</AccordionTrigger>
            <AccordionContent>
               {formData.certifications?.map((item, index) => (
                  <div key={index} className="p-4 border border-slate-700 rounded-lg mb-4 relative">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input name="name" value={item.name} onChange={(e) => handleDynamicChange('certifications', index, e)} placeholder="Certification Name" />
                          <Input name="issuingOrg" value={item.issuingOrg} onChange={(e) => handleDynamicChange('certifications', index, e)} placeholder="Issuing Organization" />
                          <Input name="date" value={item.date} onChange={(e) => handleDynamicChange('certifications', index, e)} placeholder="Date Obtained" />
                      </div>
                       <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeDynamicItem('certifications', index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                  </div>
              ))}
              <Button variant="outline" onClick={() => addDynamicItem('certifications')} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Certification
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="pt-6 flex justify-end">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
} 