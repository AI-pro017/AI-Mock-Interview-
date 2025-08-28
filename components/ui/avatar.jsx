'use client';

import Image from 'next/image';
import { useState } from 'react';

export function Avatar({ 
  src, 
  alt, 
  name, 
  size = 56, 
  className = "",
  fallbackClassName = ""
}) {
  const [imageError, setImageError] = useState(false);
  
  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on name
  const getColorFromName = (name) => {
    if (!name) return 'from-blue-500 to-purple-600';
    
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-purple-500 to-pink-600',
      'from-teal-500 to-blue-600',
      'from-pink-500 to-red-600',
      'from-indigo-500 to-purple-600',
      'from-yellow-500 to-orange-600'
    ];
    
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  if (src && !imageError) {
    return (
      <Image
        src={src}
        alt={alt || name}
        width={size}
        height={size}
        className={`rounded-full flex-shrink-0 border-2 border-gray-600 ${className}`}
        onError={() => setImageError(true)}
        style={{ color: 'transparent', visibility: 'visible' }}
      />
    );
  }

  return (
    <div 
      className={`w-${size/4} h-${size/4} rounded-full bg-gradient-to-br ${getColorFromName(name)} flex items-center justify-center text-white font-bold border-2 border-gray-600 ${fallbackClassName}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        fontSize: `${Math.max(size * 0.4, 16)}px`
      }}
    >
      {getInitials(name)}
    </div>
  );
}
