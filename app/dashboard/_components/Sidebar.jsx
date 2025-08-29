'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusSquare,
  History,
  User,
  Shield,
  Bot,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
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
      name: 'Interview Copilot',
      icon: Bot,
      path: '/dashboard/copilot',
    },
    {
      id: 3,
      name: 'New Mock Interview',
      icon: PlusSquare,
      path: '/dashboard/interview',
    },
    {
      id: 4,
      name: 'Mock Interview History',
      icon: History,
      path: '/dashboard/interview-history',
    },
    {
      id: 5,
      name: 'My Profile',
      icon: User,
      path: '/dashboard/profile',
    },
    {
      id: 6,
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
    <div className={`hidden md:block h-screen fixed left-0 top-16 text-white bg-[#0d1526] border-r border-[#1e293b] border-t border-[#1e293b] z-50 transition-all duration-300 ${isCollapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
      <div className="relative h-full">
        {/* Collapse/Expand button - positioned at the bottom edge of sidebar */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="absolute right-2 bottom-20 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full transition-all duration-300 flex items-center justify-center border border-gray-600 shadow-xl hover:scale-110 z-[100]"
            aria-label="Hide sidebar"
            title="Hide sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-2" />
          </button>
        )}
        
        <div className="py-8">
          {/* Menu items */}
          <div className="px-4">
            {menuList.map((item) => (
              <Link href={item.path} key={item.id}>
                <div
                  className={`flex items-center justify-start gap-3 p-3 mb-2 px-2 rounded-lg cursor-pointer transition-all whitespace-nowrap
                  ${isActive(item.path) 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="h-6 w-6 flex-shrink-0" />
                  <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    {item.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 