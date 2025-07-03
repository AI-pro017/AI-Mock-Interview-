'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusSquare,
  History,
  User,
  Shield,
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const menuList = [
    {
      id: 1,
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      id: 2,
      name: 'New Interview',
      icon: PlusSquare,
      path: '/dashboard/interview',
    },
    {
      id: 3,
      name: 'Interview History',
      icon: History,
      path: '/dashboard/interview-history',
    },
    {
      id: 4,
      name: 'My Profile',
      icon: User,
      path: '/dashboard/profile',
    },
    {
      id: 5,
      name: 'Upgrade',
      icon: Shield,
      path: '/dashboard/upgrade',
    },
  ];

  // Improved matching logic that prevents partial matches
  const isActive = (itemPath) => {
    // Exact match for the dashboard path
    if (itemPath === '/dashboard') {
      return pathname === '/dashboard';
    }
    
    // For other items, we need to ensure we don't match substrings
    if (pathname.startsWith(itemPath)) {
      if (pathname === itemPath) {
        return true;
      }
      
      const nextChar = pathname.charAt(itemPath.length);
      return nextChar === '/' || nextChar === '';
    }
    
    return false;
  };

  return (
    <div className="hidden md:block h-screen fixed left-0 top-[65px] w-64 text-white bg-[#0d1526] border-r border-[#1e293b]">
      <div className="py-8">
        {/* Menu items */}
        <div className="px-4">
          {menuList.map((item) => (
            <Link href={item.path} key={item.id}>
              <div
                className={`flex items-center justify-start gap-3 p-3 mb-2 px-4 rounded-lg cursor-pointer transition-all
                ${isActive(item.path) 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <item.icon className="h-6 w-6 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 