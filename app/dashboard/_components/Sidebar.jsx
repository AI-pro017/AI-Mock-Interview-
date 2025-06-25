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
      path: '/dashboard/interview', // Changed to a more general path
    },
    {
      id: 3,
      name: 'Interview History',
      icon: History,
      path: '/dashboard/history',
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
    <div className="h-screen w-64 bg-white border-r shadow-sm fixed">
      <div className="p-4 flex justify-center items-center border-b">
        <Link href="/">
          <Image src="/logo.svg" alt="logo" width={120} height={80} />
        </Link>
      </div>
      <div className="p-4">
        {menuList.map((item) => (
          <Link href={item.path} key={item.id}>
            <div
              className={`flex items-center gap-3 p-3 mb-2 rounded-lg cursor-pointer hover:bg-primary hover:text-white transition-all
              ${pathname === item.path ? 'bg-primary text-white' : 'text-gray-600'}
            `}
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