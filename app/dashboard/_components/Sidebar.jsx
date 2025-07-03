'use client';

import Link from 'next/link';
import Image from 'next/image';
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

  return (
    <div className="h-screen w-64 bg-[#111827] fixed left-0 top-0 text-white">
      <div className="p-4 flex justify-center items-center border-b border-gray-700">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-md p-1">
              <Image src="/logo.svg" alt="logo" width={28} height={28} />
            </div>
            <span className="font-bold text-lg">Logoipsum</span>
          </div>
        </Link>
      </div>
      <div className="p-4">
        {menuList.map((item) => (
          <Link href={item.path} key={item.id}>
            <div
              className={`flex items-center gap-3 p-3 mb-2 rounded-lg cursor-pointer transition-all
              ${pathname === item.path 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar; 