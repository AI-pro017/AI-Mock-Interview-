"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Camera, AlertTriangle } from 'lucide-react';

export default function CameraSelection({ initialEnabled, onCameraToggle }) {
  const [cameraEnabled, setCameraEnabled] = useState(initialEnabled || false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isHttps, setIsHttps] = useState(true);

  // Sync state with parent when initialEnabled prop changes
  useEffect(() => {
    setCameraEnabled(initialEnabled || false);
  }, [initialEnabled]);

  // Check browser support on mount
  useEffect(() => {
    // Check if MediaDevices API is supported
    if (!navigator.mediaDevices) {
      console.error("MediaDevices API not supported in this browser");
      setBrowserSupported(false);
    }
    
    // Check if we're on HTTPS
    if (typeof window !== 'undefined') {
      setIsHttps(window.location.protocol === 'https:');
    }
  }, []);

  // Simple toggle without trying to access camera
  const handleCameraToggle = () => {
    const newState = !cameraEnabled;
    setCameraEnabled(newState);
    onCameraToggle(newState);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Camera Settings</h2>
      <div className="space-y-6">
        {/* Browser compatibility warnings */}
        {!browserSupported && (
          <div className="bg-amber-100 border border-amber-300 text-amber-800 p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Browser not compatible with camera access</p>
              <p className="text-sm mt-1">Your browser doesn't support the MediaDevices API required for camera access.</p>
              <p className="text-sm mt-1">Try using Chrome, Firefox, Safari, or Edge.</p>
            </div>
          </div>
        )}
        
        {!isHttps && (
          <div className="bg-amber-100 border border-amber-300 text-amber-800 p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">HTTPS Required</p>
              <p className="text-sm mt-1">Camera access requires a secure connection (HTTPS).</p>
              <p className="text-sm mt-1">Contact your administrator or try accessing this page via HTTPS.</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <Label>Camera for interview</Label>
          </div>
          
          <Button 
            variant={cameraEnabled ? "default" : "outline"}
            size="sm"
            onClick={handleCameraToggle}
            disabled={!browserSupported || !isHttps}
            className="flex items-center gap-1 min-w-[100px]"
          >
            {cameraEnabled ? (
              <>
                <Video className="h-4 w-4 mr-1" />
                Enabled
              </>
            ) : (
              <>
                <VideoOff className="h-4 w-4 mr-1" />
                Disabled
              </>
            )}
          </Button>
        </div>
        
        <div className="bg-gray-900 rounded-lg overflow-hidden h-48 flex flex-col items-center justify-center p-4 text-center">
          <div className="text-white">
            {!browserSupported || !isHttps ? (
              <>
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-400" />
                <p>Camera access is not available</p>
                <p className="text-sm text-gray-400 mt-2">
                  {!browserSupported ? 'Your browser does not support camera access' : 'HTTPS connection is required'}
                </p>
              </>
            ) : cameraEnabled ? (
              <>
                <Video className="h-12 w-12 mx-auto mb-4" />
                <p>Camera will be enabled when the interview starts</p>
                <p className="text-sm text-gray-400 mt-2">
                  You'll be asked for camera permission when the interview begins
                </p>
              </>
            ) : (
              <>
                <VideoOff className="h-12 w-12 mx-auto mb-4" />
                <p>Camera will remain disabled during the interview</p>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
} 