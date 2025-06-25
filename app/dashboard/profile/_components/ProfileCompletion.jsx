'use client';

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfileCompletion({ user }) {
  const calculateCompletion = () => {
    if (!user) return 0;

    const fields = [
      user.name,
      user.image, // Avatar
      user.experienceLevel,
      user.targetRoles,
      user.resumeUrl,
      user.timezone
    ];

    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    const totalFields = fields.length;
    
    // Ensure we don't divide by zero
    if (totalFields === 0) return 100;

    const percentage = Math.round((filledFields / totalFields) * 100);
    return percentage;
  };

  const completionPercentage = calculateCompletion();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Completion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress value={completionPercentage} />
          <p className="text-sm text-muted-foreground text-center">
            {completionPercentage}% Complete
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 