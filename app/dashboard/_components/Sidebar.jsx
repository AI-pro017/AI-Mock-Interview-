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

  const activeMenu = menuList.find((item) => item.path === pathname);

  return (
    <div className="hidden md:block h-screen w-64 bg-[#111827] fixed left-0 top-0 text-white">
      <div className="p-4 flex items-center gap-3 border-b border-gray-700">
        <Image
          src="/favicon.jpg"
          alt="logo"
          width={40}
          height={40}
          className="rounded-md"
        />
        {activeMenu && (
          <h2 className="font-bold text-lg">{activeMenu.name}</h2>
        )}
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