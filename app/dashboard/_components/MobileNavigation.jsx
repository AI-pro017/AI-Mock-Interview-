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
} from 'lucide-react';

const MobileNavigation = () => {
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

    const isActive = (itemPath) => {
        if (itemPath === '/dashboard') {
            return pathname === '/dashboard';
        }
        
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d1526] border-t border-[#1e293b] z-50">
            <div className="flex justify-around items-center py-2">
                {menuList.map((item) => (
                    <Link href={item.path} key={item.id}>
                        <div
                            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                                isActive(item.path) 
                                    ? 'text-blue-400' 
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <item.icon className="h-5 w-5 mb-1" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default MobileNavigation; 